#!/usr/bin/env python3
# Pruebas del profe de TOEFL sin IA: python prueba_toefl.py   (no usa internet ni IA)
import datetime as dt
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import toefl_banco as B  # noqa: E402
import toefl_offline as T  # noqa: E402

BUENA = ("In my opinion, universities should require a personal finance course. I agree with Kelly because many young people "
         "get into debt without understanding how credit works. For example, my brother got a credit card when he was eighteen "
         "and he did not know about interest, so he ended up paying much more than he expected. However, Paul makes a good "
         "point about time. Therefore, I think a short course in the first year would be a crucial benefit for students and "
         "would not take much time away from their major.")


class Toefl(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.t = T.Toefl(self.dir)

    def test_cada_tipo_se_genera_y_califica(self):
        for tipo in T.TIPOS:
            it = self.t.nueva(tipo)
            self.assertEqual(it['tipo'], tipo)
            r = self.t.calificar(tipo, it['id'], '' if tipo not in ('lectura', 'completar') else [])
            self.assertIn('banda', r)

    def test_completar(self):
        partes, huecos = T.completar_palabras(B.PARRAFOS[0][1])
        self.assertEqual(len(huecos), 10)
        self.assertEqual(sum(1 for p in partes if isinstance(p, dict)), 10)
        r = self.t.calificar('completar', 0, [p[len(pre):] for p, pre in huecos])
        self.assertEqual(r['aciertos'], 10)
        r = self.t.calificar('completar', 0, [p for p, pre in huecos])  # también acepta la palabra completa
        self.assertEqual(r['aciertos'], 10)

    def test_ordenar(self):
        self.assertTrue(self.t.calificar('ordenar', 0, 'Could you tell me where the library is?')['bien'])
        r = self.t.calificar('ordenar', 0, 'Could you tell me where is the library?')
        self.assertFalse(r['bien'])
        self.assertIn('indirecta', r['nota'])
        it = self.t.nueva('ordenar', 0, semilla=1)
        self.assertNotEqual(it['pedazos'], T.pedazos_de(B.ORACIONES[0][1]))

    def test_lectura(self):
        correctas = [c for _q, _o, c, _p in B.LECTURAS[0][3]]
        self.assertEqual(self.t.calificar('lectura', 0, correctas)['aciertos'], 3)
        self.assertEqual(self.t.calificar('lectura', 0, [None, '9', 'x'])['aciertos'], 0)

    def test_rubrica_distingue(self):
        buena = self.t.calificar('discusion', 0, BUENA)
        mala = self.t.calificar('discusion', 0, 'i think is good. he don\'t know money.')
        self.assertGreaterEqual(buena['puntos'], 4)
        self.assertLessEqual(mala['puntos'], 1.5)
        self.assertTrue(mala['mejorar'])
        correo = ("Hi Alex,\n\nI'm writing because something bad happened with your book. I spilled coffee on it by accident "
                  "and some pages are damaged. I'm really sorry, it was my fault. I will buy you a new copy this weekend, "
                  "or if you prefer, I can pay you for it. Again, I apologize.\n\nBest,\nKiga")
        r = self.t.calificar('correo', 0, correo)
        self.assertEqual(sum('Cumpliste' in b for b in r['bien']), 3)
        sin_disculpa = self.t.calificar('correo', 0, 'Hi Alex, I spilled coffee on your book. I will buy a new one. Best, Kiga')
        self.assertTrue(any('Apologize' in m for m in sin_disculpa['mejorar']))

    def test_dictado(self):
        r = self.t.calificar('dictado', 1, 'the bookstore is on first floor')
        self.assertEqual(r['faltan'], ['the'])
        self.assertGreater(r['parecido'], 80)

    def test_progreso_y_persistencia(self):
        self.assertIsNone(self.t.progreso()['banda'])
        self.t.calificar('ordenar', 0, 'Could you tell me where the library is?')
        self.t.calificar('discusion', 0, BUENA)
        p = T.Toefl(self.dir).progreso()
        self.assertEqual(p['secciones']['writing']['intentos'], 2)
        self.assertIsNotNone(p['banda'])
        self.assertIn(p['cefr'], ('C2', 'C1', 'B2', 'B1', 'A2', 'A1'))

    def test_vocab_leitner(self):
        v = self.t.vocab_siguiente(5)
        self.assertEqual(len(v['tarjetas']), 5)
        w = v['tarjetas'][0]['en']
        self.assertEqual(self.t.vocab_responder(w, True)['caja'], 1)
        self.assertEqual(self.t.vocab_responder(w, True)['caja'], 2)
        self.assertEqual(self.t.vocab_responder(w, False)['caja'], 1)
        self.assertNotIn(w, [c['en'] for c in self.t.vocab_siguiente(5)['tarjetas']] if self.t.p['vocab'][w]['prox'] > dt.date.today().isoformat() else [])

    def test_plan(self):
        self.t.poner_meta(4.5, (dt.date.today() + dt.timedelta(days=30)).isoformat())
        p = self.t.plan()
        self.assertEqual(p['dias_al_examen'], 30)
        self.assertEqual(len(p['semanas']), 4)
        with self.assertRaises(ValueError):
            self.t.poner_meta(fecha='mañana')

    def test_preguntas(self):
        self.assertIsNone(self.t.responder('hola cómo estás'))
        for q, busca in [('cómo es el toefl', 'Speaking'), ('toefl score', 'CEFR'), ('plantilla academic discussion', 'I agree with'),
                         ('toefl writing', 'Build a Sentence'), ('mi nivel', 'prácticas'), ('practica toefl email', 'correo'),
                         ('tofel reading tips', 'Complete the Words')]:
            r = self.t.responder(q)
            self.assertIsNotNone(r, q)
            self.assertIn(busca, r['respuesta'], q)
        self.assertEqual(self.t.responder('practica toefl email')['accion'], 'practicar:correo')

    def test_bandas(self):
        self.assertEqual(T.banda_de(100), 6)
        self.assertEqual(T.banda_de(0), 1)
        self.assertEqual(T.cefr_de(4.5), 'B2')
        self.assertEqual(T.cefr_de(5), 'C1')


if __name__ == '__main__':
    unittest.main(verbosity=1)
