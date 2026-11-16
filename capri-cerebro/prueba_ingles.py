#!/usr/bin/env python3
# Pruebas del inglés sin IA de Capri: python prueba_ingles.py   (no usa internet ni IA)
import datetime as dt
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ingles_offline as io  # noqa: E402


class Detectar(unittest.TestCase):
    def test_ingles_puro(self):
        for t in ['Hello, how are you?', 'I love you', "I'm learning English", 'The dogs are sleeping in the garden.']:
            d = io.detectar(t)
            self.assertEqual(d['idioma'], 'en', t)
            self.assertTrue(d['puro'], t)

    def test_espanol(self):
        for t in ['hola cómo estás', 'te amo', 'quiero comer tacos', '¿qué hora es?']:
            self.assertEqual(io.detectar(t)['idioma'], 'es', t)

    def test_mezcla(self):
        d = io.detectar('Me gusta the music')
        self.assertFalse(d['puro'])
        self.assertIn('gusta', d['es'])
        d = io.detectar('I want to eat tacos con salsa')
        self.assertEqual(d['idioma'], 'mixto')
        self.assertIn('con', d['es'])

    def test_ambiguas_solas(self):
        for t in ['no', 'ok', '', '123']:
            self.assertFalse(io.detectar(t)['puro'], t)


class Traducir(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ing = io.Ingles(None)

    def test_frases(self):
        casos = {
            'I am tired.': 'Estoy cansado.',
            'She is very happy today.': 'Ella está muy feliz hoy.',
            'Are you hungry?': '¿Tienes hambre?',
            'She likes cats.': 'A ella le gustan los gatos.',
            "I don't understand this word.": 'No entiendo esta palabra.',
            'Where is the bathroom?': '¿Dónde está el baño?',
            'What are you doing?': '¿Qué estás haciendo?',
            'Can you help me?': '¿Puedes ayudarme?',
            'Help me please.': 'Ayúdame por favor.',
            'We went to the beach yesterday.': 'Fuimos a la playa ayer.',
            'My mother has a beautiful house.': 'Mi madre tiene una casa hermosa.',
            'I love you.': 'Te amo.',
            'It is cold.': 'Hace frío.',
            'I am 20 years old.': 'Tengo 20 años.',
            'I am going to study English tonight.': 'Voy a estudiar inglés esta noche.',
            "Kiga's car is black.": 'El carro de Kiga es negro.',
            'I would like a coffee.': 'Me gustaría un café.',
            'I have to work tomorrow.': 'Tengo que trabajar mañana.',
            'Did you eat?': '¿Comiste?',
            "Don't worry.": 'No te preocupes.',
            'I think you are beautiful.': 'Pienso que eres hermoso.',
            'My brother and my sister live in Monterrey.': 'Mi hermano y mi hermana viven en Monterrey.',
            'I need a new phone because my phone is broken.': 'Necesito un teléfono nuevo porque mi teléfono está roto.',
            'There are three cats in my house.': 'Hay tres gatos en mi casa.',
            'I told him the truth.': 'Le dije la verdad.',
            'They will travel to Mexico next week.': 'Ellos viajarán a Mexico la próxima semana.',
            'I have eaten an apple.': 'He comido una manzana.',
        }
        for en, es in casos.items():
            self.assertEqual(self.ing.traducir(en)['texto'], es, en)

    def test_desconocidas(self):
        r = self.ing.traducir('I like my xylophone')
        self.assertIn('xylophone', r['desconocidas'])

    def test_al_ingles(self):
        self.assertEqual(self.ing.al_ingles('perro grande')['texto'], 'big dog')
        self.assertEqual(self.ing.al_ingles('gracias')['texto'], 'thank you')

    def test_conjugaciones(self):
        self.assertEqual(io.presente('jugar', 'ue', 0), 'juego')
        self.assertEqual(io.presente('conocer', '', 0), 'conozco')
        self.assertEqual(io.preterito('buscar', '', 0), 'busqué')
        self.assertEqual(io.preterito('dormir', 'ue', 2), 'durmió')
        self.assertEqual(io.preterito('leer', '', 2), 'leyó')
        self.assertEqual(io.futuro('tener', 1), 'tendrás')
        self.assertEqual(io.gerundio('pedir', 'i'), 'pidiendo')
        self.assertEqual(io.acentuar_para_clitico('ayuda'), 'ayúda')


class Corregir(unittest.TestCase):
    def test_errores_tipicos(self):
        casos = [("He don't like it", "He doesn't"), ('I have 25 years', 'I am 25 years old'), ('She go to school', 'She goes'),
                 ('I am agree', 'I agree'), ('I need informations', 'information'), ('I can to swim', 'can swim'),
                 ('I eat a apple', 'an apple'), ("I didn't went", "didn't go"), ('explain me this', 'explain to me')]
        for mal, bien in casos:
            c = io.corregir(mal)
            self.assertTrue(any(bien in x['bien'] for x in c['correcciones']), (mal, c))

    def test_bien_escrito_no_se_toca(self):
        for t in ['She goes to school every day.', 'I am 25 years old.', 'I agree with you.', 'An hour ago I ate an apple.']:
            self.assertEqual(io.corregir(t)['correcciones'], [], t)


class Responder(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.ing = io.Ingles(self.dir)

    def r(self, t):
        return self.ing.responder(t, 'Kiga', ahora=dt.datetime(2026, 11, 16, 22, 5))

    def test_intenciones(self):
        casos = {'hello capri': 'saludo', 'how are you?': 'como_estas', 'What is 12 times 4?': 'cuenta',
                 'what does tired mean?': 'significado', 'how do you say perro grande': 'como_se_dice', 'spell cat': 'deletrear',
                 'what time is it?': 'hora', 'what day is it today?': 'fecha', 'translate I want to sleep': 'traducir',
                 'thank you!': 'gracias', 'what can you do': 'ayuda', 'I went to the store': 'entender',
                 'hola cómo estás': 'no_ingles'}
        for t, i in casos.items():
            self.assertEqual(self.r(t)['intencion'], i, t)

    def test_respuestas(self):
        self.assertIn('48', self.r('what is 12 times 4')['respuesta'])
        self.assertIn('9', self.r('square root of 81')['respuesta'])
        self.assertIn('10:05 PM', self.r('what time is it')['respuesta'])
        self.assertIn('November 16, 2026', self.r("what's the date")['respuesta'])
        self.assertIn('C - A - T', self.r('spell cat')['respuesta'])
        self.assertIn('cansado', self.r('what does tired mean')['respuesta'])
        self.assertIn('Kiga', self.r('hi')['respuesta'])

    def test_corrige_al_platicar(self):
        r = self.r("He don't have money")
        self.assertTrue(r['correcciones'])
        self.assertIn('✎', r['respuesta'])

    def test_aprende_y_recuerda(self):
        self.assertEqual(self.r('learn: lizard = lagartija')['intencion'], 'aprender')
        otro = io.Ingles(self.dir)  # se guardó en disco
        self.assertIn('lagartija', otro.responder('what does lizard mean')['respuesta'])
        self.assertIn('lagartija', otro.traducir('I saw a lizard')['texto'])

    def test_no_truena_con_basura(self):
        for t in ['', '   ', '???', '%%%%', 'a' * 5000, "'''", 'I I I I', 'the the the', '12 + ', 'what is 2 ** 999999']:
            self.ing.responder(t)


if __name__ == '__main__':
    unittest.main(verbosity=1)
