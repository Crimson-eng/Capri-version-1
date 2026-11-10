#!/usr/bin/env python3
# Pruebas del cerebro de Capri: python prueba_cerebro.py   (no usa internet: Gemini y Ollama van simulados)
import json
import os
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import capri_cerebro as cc  # noqa: E402


class GeminiFalso(BaseHTTPRequestHandler):
    pedidos = []

    def log_message(self, *a):
        pass

    def do_POST(self):
        cuerpo = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        GeminiFalso.pedidos.append((self.path, cuerpo, self.headers.get('x-goog-api-key')))
        if 'agotado' in self.path:
            self.send_response(429)
            self.end_headers()
            self.wfile.write(b'{"error":{"message":"sin cupo"}}')
            return
        txt = '[sonrisa_traviesa] ¿Ya me extrañabas, choom?\n<<recuerda: gusto | le gusta el café de olla>>\n<<animo: juguetona | 6 | la dejaron sola>>'
        datos = json.dumps({'candidates': [{'content': {'parts': [{'text': txt}]}}]}).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(datos)))
        self.end_headers()
        self.wfile.write(datos)


class Pruebas(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.falso = ThreadingHTTPServer(('127.0.0.1', 0), GeminiFalso)
        threading.Thread(target=cls.falso.serve_forever, daemon=True).start()
        cc.GEMINI = 'http://127.0.0.1:%d/v1beta/' % cls.falso.server_port
        cc.OLLAMA = 'http://127.0.0.1:9'   # sin Ollama

    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.mem = cc.Memoria(self.dir)
        self.cb = cc.Cerebro(self.mem, 0)
        self.srv = ThreadingHTTPServer(('127.0.0.1', 0), cc.hacer_manejador(self.cb))
        self.cb.puerto = self.srv.server_port
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        self.base = 'http://127.0.0.1:%d' % self.srv.server_port

    def tearDown(self):
        self.srv.shutdown()
        self.srv.server_close()

    def pide(self, ruta, cuerpo=None, cab=None, metodo=None):
        h = {'X-Capri': '1', 'Content-Type': 'application/json'}
        h.update(cab or {})
        req = urllib.request.Request(self.base + ruta, data=None if cuerpo is None else json.dumps(cuerpo).encode(), headers=h,
                                     method=metodo or ('GET' if cuerpo is None else 'POST'))
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                return r.status, dict(r.headers), r.read()
        except urllib.error.HTTPError as e:
            return e.code, dict(e.headers), e.read()

    # ---------- memoria
    def test_absorbe_etiquetas(self):
        self.mem.absorber('[feliz] hola <<recuerda: escuela | examen de anatomía el viernes>> <<recuerda: dato suelto>> <<animo: feliz | 8 | lo vio>>')
        textos = [h['t'] for h in self.mem.e['mem']['hechos']]
        self.assertIn('examen de anatomía el viernes', textos)
        self.assertIn('dato suelto', textos)
        self.assertEqual(self.mem.e['mem']['animo']['n'], 'feliz')
        self.mem.absorber('<<olvida: anatomía>>')
        self.assertNotIn('examen de anatomía el viernes', [h['t'] for h in self.mem.e['mem']['hechos']])

    def test_fusion_tres_vias(self):
        m, rpc = self.mem.fusionar('pc', {'hechos': [{'c': 'gusto', 't': 'le gusta el rock', 'ts': 1}, {'c': 'persona', 't': 'su hermana es Ana', 'ts': 2}]})
        m, rcel = self.mem.fusionar('cel', {'hechos': [{'c': 'dia', 't': 'hoy fue al gym', 'ts': cc.ahora_ms()}]})
        self.assertEqual(len(m['hechos']), 3)
        cel = [dict(h) for h in m['hechos']]
        # la PC borra lo de Ana (y aplicó la respuesta anterior)
        m, rpc = self.mem.fusionar('pc', {'hechos': [{'c': 'gusto', 't': 'le gusta el rock', 'ts': 1}]}, rpc)
        self.assertEqual({h['t'] for h in m['hechos']}, {'le gusta el rock', 'hoy fue al gym'})
        # el celular todavía trae a Ana: como ya se borró en otro lado, no revive
        m, rcel = self.mem.fusionar('cel', {'hechos': cel}, rcel)
        self.assertEqual({h['t'] for h in m['hechos']}, {'le gusta el rock', 'hoy fue al gym'})

    def test_respuesta_perdida_no_borra(self):
        m, r1 = self.mem.fusionar('pc', {'hechos': [{'c': 'otro', 't': 'a', 'ts': 1}]})
        self.mem.fusionar('cel', {'hechos': [{'c': 'otro', 't': 'b', 'ts': 2}]})
        # la PC nunca recibió la respuesta con «b» y vuelve a mandar su lista vieja con su rev viejo (o sin rev)
        m, _ = self.mem.fusionar('pc', {'hechos': [{'c': 'otro', 't': 'a', 'ts': 1}]}, r1)
        self.assertEqual({h['t'] for h in m['hechos']}, {'a', 'b'})
        m, _ = self.mem.fusionar('pc', {'hechos': []})
        self.assertEqual({h['t'] for h in m['hechos']}, {'a', 'b'})

    def test_borrado_en_otro_dispositivo_no_revive(self):
        m, rpc = self.mem.fusionar('pc', {'hechos': [{'c': 'otro', 't': 'x', 'ts': 1}]})
        m, rcel = self.mem.fusionar('cel', {'hechos': [{'c': 'otro', 't': 'x', 'ts': 1}]})
        self.mem.fusionar('cel', {'hechos': []}, rcel)          # lo borró en el celular
        m, _ = self.mem.fusionar('pc', {'hechos': [{'c': 'otro', 't': 'x', 'ts': 1}]}, rpc)  # la PC todavía lo trae
        self.assertEqual(m['hechos'], [])

    def test_guarda_y_carga(self):
        self.mem.recordar('gusto', 'le gusta el sushi')
        self.mem.guardar()
        otra = cc.Memoria(self.dir)
        self.assertEqual(otra.e['mem']['hechos'][0]['t'], 'le gusta el sushi')
        if os.name == 'nt':
            with open(otra.archivo, 'rb') as f:
                self.assertNotIn(b'sushi', f.read())   # cifrado con DPAPI

    def test_archivo_danado_no_se_pierde(self):
        with open(self.mem.archivo, 'wb') as f:
            f.write(b'basura')
        otra = cc.Memoria(self.dir)
        self.assertEqual(otra.e['mem']['hechos'], [])
        self.assertTrue(any('no-se-pudo-abrir' in n for n in os.listdir(self.dir)))

    def test_persona_con_memoria(self):
        self.mem.e['persona'] = 'Eres Capri de la app ' + 'x' * 300 + '\n{{MEMORIA}}\nfin'
        self.mem.recordar('gusto', 'le gusta el café')
        s = cc.sistema(self.mem.e)
        self.assertIn('le gusta el café', s)
        self.assertNotIn('{{MEMORIA}}', s)
        self.assertTrue(cc.sistema(estado_sin_persona()).startswith('Eres Capri'))

    def test_silencio(self):
        import datetime as dt
        self.mem.e['cfg']['silencio'] = [23, 8]
        self.assertTrue(self.cb.en_silencio(dt.datetime(2026, 1, 1, 2)))
        self.assertFalse(self.cb.en_silencio(dt.datetime(2026, 1, 1, 15)))
        self.mem.e['cfg']['silencio'] = [13, 15]
        self.assertTrue(self.cb.en_silencio(dt.datetime(2026, 1, 1, 14)))

    # ---------- servidor y seguridad
    def test_salud_y_pagina(self):
        c, h, b = self.pide('/salud')
        self.assertEqual(c, 200)
        self.assertTrue(json.loads(b)['ok'])
        c, h, b = self.pide('/')
        self.assertEqual(c, 200)
        self.assertIn(b'CEREBRO DE CAPRI', b)

    def test_sin_cabecera_capri(self):
        req = urllib.request.Request(self.base + '/api/estado')
        with self.assertRaises(urllib.error.HTTPError) as e:
            urllib.request.urlopen(req, timeout=5)
        self.assertEqual(e.exception.code, 403)

    def test_origen_ajeno(self):
        c, h, b = self.pide('/api/estado', cab={'Origin': 'https://pagina-mala.com'})
        self.assertEqual(c, 403)
        c, h, b = self.pide('/api/sync', {'mem': {}}, cab={'Origin': 'https://pagina-mala.com'}, metodo='OPTIONS')
        self.assertEqual(c, 403)

    def test_host_ajeno_dns_rebinding(self):
        c, h, b = self.pide('/api/estado', cab={'Host': 'malo.ejemplo.com:%d' % self.srv.server_port})
        self.assertEqual(c, 403)

    def test_preflight_de_la_app(self):
        o = 'http://127.0.0.1:47823'
        c, h, b = self.pide('/api/sync', None, cab={'Origin': o, 'Access-Control-Request-Method': 'POST'}, metodo='OPTIONS')
        self.assertEqual(c, 204)
        self.assertEqual(h.get('Access-Control-Allow-Origin'), o)
        self.assertEqual(h.get('Access-Control-Allow-Private-Network'), 'true')
        c, h, b = self.pide('/api/estado', cab={'Origin': 'https://crimson-eng.github.io'})
        self.assertEqual(c, 200)
        self.assertEqual(h.get('Access-Control-Allow-Origin'), 'https://crimson-eng.github.io')

    def test_sync_ida_y_vuelta(self):
        hist = [{'role': 'user', 'text': 'hola'}, {'role': 'model', 'text': '[feliz] holi'}]
        c, h, b = self.pide('/api/sync', {'dispositivo': 'app1', 'mem': {'hechos': [{'c': 'gusto', 't': 'le gusta el rock', 'ts': 1}]},
                                         'history': hist, 'hist_ts': 1000, 'persona': 'P' * 300 + '{{MEMORIA}}',
                                         'cfg': {'nombre': 'Kiga', 'modelo': 'gemini-x', 'key': 'K'}})
        self.assertEqual(c, 200)
        r = json.loads(b)
        self.assertEqual([x['t'] for x in r['mem']['hechos']], ['le gusta el rock'])
        self.assertNotIn('history', r)              # la app ya tiene la más nueva
        self.assertEqual(self.mem.e['cfg']['key'], 'K')
        self.assertTrue(self.cb.app_abierta())
        # con la app abierta el corazón no habla
        self.cb.proximo = 0
        self.assertIsNone(self.cb.latir())

    def test_habla_sola_con_app_cerrada_y_llega_al_buzon(self):
        self.mem.e['cfg'].update(key='K', modelo='gemini-2.5-flash', notif=False, voz=False)
        self.mem.e['history'] = [{'role': 'user', 'text': 'hola'}]
        self.cb.app_vista = 0
        self.cb.proximo = 0
        self.cb.en_silencio = lambda cuando=None: False
        t = self.cb.latir()
        self.assertEqual(t, '¿Ya me extrañabas, choom?')
        path, cuerpo, key = GeminiFalso.pedidos[-1]
        self.assertEqual(key, 'K')
        self.assertIn('gemini-2.5-flash:generateContent', path)
        self.assertEqual(cuerpo['generationConfig']['thinkingConfig'], {'thinkingBudget': 0})
        self.assertIn('le gusta el café de olla', [h['t'] for h in self.mem.e['mem']['hechos']])
        # la app se abre: recibe el mensaje, la plática nueva, y lo marca como visto
        c, h, b = self.pide('/api/sync', {'dispositivo': 'app1', 'mem': {'hechos': []}, 'history': [], 'hist_ts': 1})
        r = json.loads(b)
        self.assertEqual(len(r['buzon']), 1)
        self.assertEqual(r['history'][-1]['text'], '[sonrisa_traviesa] ¿Ya me extrañabas, choom?')
        self.pide('/api/visto', {'ids': [r['buzon'][0]['id']]})
        c, h, b = self.pide('/api/sync', {'dispositivo': 'app1', 'mem': r['mem'], 'history': r['history'], 'hist_ts': r['hist_ts']})
        self.assertEqual(json.loads(b)['buzon'], [])

    def test_modelo_sin_cupo_prueba_otro(self):
        self.mem.e['cfg'].update(key='K', modelo='gemini-agotado', modelos=['gemini-agotado', 'gemini-2.5-flash-lite'])
        txt, modelo = cc.gemini(self.mem.e['cfg'], 'sis', [{'role': 'user', 'text': 'hola'}])
        self.assertEqual(modelo, 'gemini-2.5-flash-lite')

    def test_chat_desde_la_pagina(self):
        self.mem.e['cfg'].update(key='K', modelo='gemini-2.5-flash')
        c, h, b = self.pide('/api/chat', {'texto': '¿me extrañaste?'})
        self.assertEqual(c, 200)
        r = json.loads(b)
        self.assertEqual(r['estado'], 'sonrisa_traviesa')
        self.assertEqual(self.mem.e['history'][-2]['text'], '¿me extrañaste?')

    def test_sin_cerebro_no_truena(self):
        self.mem.e['cfg'].update(key='')
        self.cb.app_vista = 0
        self.cb.proximo = 0
        self.cb.en_silencio = lambda cuando=None: False
        self.assertIsNone(self.cb.latir())
        self.assertEqual(self.mem.e['buzon'], [])

    def test_cfg_desde_la_pagina(self):
        c, h, b = self.pide('/api/cfg', {'cada_min': [120, 10], 'voz': True, 'max_dia': 99})
        r = json.loads(b)
        self.assertEqual(r['cada_min'], [10, 120])
        self.assertTrue(r['voz'])
        self.assertEqual(r['max_dia'], 48)


def estado_sin_persona():
    e = cc.estado_vacio()
    e['persona'] = ''
    return e


if __name__ == '__main__':
    unittest.main(verbosity=2)
