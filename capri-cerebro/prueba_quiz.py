#!/usr/bin/env python3
# Pruebas del resolvedor de quizzes sin IA: python prueba_quiz.py   (no usa internet ni IA)
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import quiz_toefl as Q  # noqa: E402

CASOS = [
("She ___ to school every day.\na) go b) goes c) going d) gone",'b'),
("I ___ to Cancún last summer.\na) go\nb) went\nc) have gone\nd) will go",'b'),
("If I ___ rich, I would travel around the world.\na) am b) were c) will be d) be",'b'),
("He is ___ than his brother.\na) tall b) taller c) more tall d) tallest",'b'),
("I look forward to ___ you.\na) see b) seeing c) saw d) seen",'b'),
("She has lived here ___ 2010.\na) for b) since c) during d) from",'b'),
("They ___ dinner when I called.\na) have b) were having c) has d) are have",'b'),
("I enjoy ___ in the morning.\na) to run b) run c) running d) ran",'c'),
("She decided ___ a new car.\na) buying b) to buy c) buy d) bought",'b'),
("This is ___ book I have ever read.\na) the most interesting b) more interesting c) most interesting d) interestingest",'a'),
("I need ___ umbrella.\na) a b) an c) the d) -",'b'),
("He can ___ English very well.\na) speaks b) speaking c) speak d) to speak",'c'),
("There ___ many people at the party.\na) was b) were c) is d) be",'b'),
("If she had studied, she ___ the exam.\na) would pass b) will pass c) would have passed d) passed",'c'),
("By the time we arrived, the movie ___.\na) already started b) had already started c) has already started d) starts",'b'),
("She sings ___.\na) beautiful b) beautifully c) beauty d) more beautiful",'b'),
("I'm not interested ___ politics.\na) on b) in c) at d) about",'b'),
("The movie was very ___.\na) bored b) boring c) bore d) boredom",'b'),
("Neither John ___ Mary came to the party.\na) or b) nor c) and d) but",'b'),
("How ___ money do you have?\na) many b) much c) lot d) few",'b'),
("Which sentence is correct?\na) He don't like coffee.\nb) He doesn't likes coffee.\nc) He doesn't like coffee.\nd) He not like coffee.",'c'),
("Choose the word closest in meaning to 'huge'.\na) tiny b) enormous c) quick d) quiet",'b'),
("I have been working here ___ five years.\na) since b) for c) during d) ago",'b'),
("She is used to ___ early.\na) wake up b) waking up c) woke up d) woken up",'b'),
("He made me ___ the dishes.\na) wash b) to wash c) washing d) washed",'a'),
("The book ___ by millions of people.\na) has read b) has been read c) have read d) reading",'b'),
("I wish I ___ more time.\na) have b) had c) will have d) having",'b'),
("Do you know where ___?\na) does she live b) she lives c) lives she d) did she live",'b'),
("She is the woman ___ car was stolen.\na) who b) which c) whose d) whom",'c'),
("He is good ___ math.\na) in b) at c) on d) for",'b'),
("Although it was raining, ___ we went out.\na) but b) - c) so d) and",'b'),
("We arrived ___ the airport late.\na) to b) at c) in d) on",'b'),
("She ___ a doctor since 2015.\na) is b) was c) has been d) will be",'c'),
("Tomorrow I ___ my grandmother.\na) visited b) will visit c) have visited d) visit to",'b'),
("She told ___ the truth.\na) to me b) me c) I d) for me",'b'),
("He ___ his homework yet.\na) didn't finish b) hasn't finished c) doesn't finish d) not finished",'b'),
("It's ___ hot to go outside.\na) too b) very much c) enough d) so much",'a'),
("Every student ___ a book.\na) have b) has c) are having d) having",'b'),
("I have ___ information about it.\na) many b) a few c) little d) an",'c'),
("He stopped ___ because it was bad for his health.\na) to smoke b) smoking c) smoke d) smoked",'b'),
]

# oraciones correctas: ninguna regla debe quejarse (para no inventar errores)
CORRECTAS = """She goes to school every day.
I went to Cancún last summer.
If I were rich, I would travel around the world.
He is taller than his brother.
I look forward to seeing you.
She has lived here since 2010.
They were having dinner when I called.
I enjoy running in the morning.
She decided to buy a new car.
This is the most interesting book I have ever read.
I need an umbrella.
He can speak English very well.
There were many people at the party.
If she had studied, she would have passed the exam.
By the time we arrived, the movie had already started.
She sings beautifully.
I'm not interested in politics.
The movie was very boring.
Neither John nor Mary came to the party.
How much money do you have?
He doesn't like coffee.
I have been working here for five years.
She is used to waking up early.
He made me wash the dishes.
The book has been read by millions of people.
I wish I had more time.
Do you know where she lives?
She is the woman whose car was stolen.
He is good at math.
Although it was raining, we went out.
We arrived at the airport late.
She has been a doctor since 2015.
Tomorrow I will visit my grandmother.
She told me the truth.
He hasn't finished his homework yet.
It's too hot to go outside.
Every student has a book.
I have little information about it.
He stopped smoking because it was bad for his health.
I stopped to buy some coffee on my way to work.
She said he would come later.
Look at this picture.
My brother is a teacher and my sister works in a hospital.
We usually have breakfast at seven.
The students who passed the test got a prize.
I've never seen such a beautiful place.
Can you tell me what time it is?
She got married last year.
He seems tired today.
They let us leave early.
I like to read books before I go to bed.
The weather is nice, so we are going to the beach.
I would rather stay home tonight.
She has a lot of friends.
I saw him crossing the street.
The children played in the garden all afternoon.
He tried to open the door, but it was locked.
My parents want me to study medicine.
I have to finish this report by Friday.
When I was a child, I lived in Mexico.
I think she knows the answer.
It is much bigger than I expected.
She asked me to help her.
Swimming is good for your health.
He drives very carefully.
The news was surprising.
I am going to visit my aunt next week.
We had a great time at the party.
The doctor told him to rest.
I don't know if he will come.""".split('\n')


class Quiz(unittest.TestCase):
    def test_banco_de_preguntas(self):
        malas = []
        for texto, esperada in CASOS:
            p = Q.resolver(texto)['preguntas'][0]
            if p['correcta'] != esperada and esperada not in (p.get('empate') or []):
                malas.append((texto.split('\n')[0], esperada, p['correcta']))
        self.assertEqual(malas, [])

    def test_sin_falsos_errores(self):
        quejas = [(o, [x['c'] for x in Q.revisar(o)]) for o in CORRECTAS if Q.revisar(o)]
        self.assertEqual(quejas, [])

    def test_explica_cada_inciso(self):
        r = Q.resolver('She ___ to school every day.\na) go\nb) goes\nc) going\nd) gone')
        t = r['respuesta']
        self.assertIn('✅ b) goes', t)
        self.assertIn('Por qué', t)
        self.assertEqual(t.count('✗'), 3)
        self.assertEqual(r['preguntas'][0]['confianza'], 'alta')

    def test_formatos(self):
        # incisos en la misma línea, con paréntesis, en mayúsculas, varias preguntas numeradas
        r = Q.resolver('1. I ___ never been to Paris. a) has b) have c) am d) was\n'
                       '2. He can ___ English. (A) speaks (B) speak (C) speaking (D) to speak\n'
                       '3) There ___ many people.\nA. was\nB. were')
        self.assertEqual([p['correcta'] for p in r['preguntas']], ['b', 'b', 'b'])
        self.assertTrue(Q.es_quiz('quiz: algo'))
        self.assertFalse(Q.es_quiz('hola, cómo estás'))

    def test_encuentra_el_error(self):
        r = Q.resolver('Find the mistake: He (A) can (B) speaks English (C) very (D) well.')['preguntas'][0]
        self.assertEqual(r['correcta'], 'b')
        r = Q.resolver('Choose the INCORRECT part.\nThe students (A) was very happy (B) because they (C) passed the exam (D) easily.\n'
                       'A) was\nB) because\nC) passed\nD) easily')['preguntas'][0]
        self.assertEqual(r['correcta'], 'a')

    def test_no_inventa(self):
        # depende del sentido: no debe elegir con seguridad
        p = Q.resolver('My father works ___ a hospital.\na) in b) on c) at d) to')['preguntas'][0]
        self.assertIsNone(p['correcta'])
        self.assertEqual(sorted(p['empate']), ['a', 'c'])
        p = Q.resolver('Which word is closest in meaning to "zxqv"?\na) slow b) fast')['preguntas'][0]
        self.assertIsNone(p['correcta'])

    def test_vocabulario(self):
        p = Q.resolver('The word "rapid" is closest in meaning to\nA. slow\nB. fast\nC. heavy\nD. late')['preguntas'][0]
        self.assertEqual(p['correcta'], 'b')


if __name__ == '__main__':
    unittest.main(verbosity=1)
