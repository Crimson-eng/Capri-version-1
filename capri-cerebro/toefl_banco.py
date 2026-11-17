# -*- coding: utf-8 -*-
"""Banco de práctica del profe de TOEFL sin IA (toefl_offline.py).

Todo es material original escrito para Capri, con el formato de las tareas del TOEFL iBT (2026), no preguntas reales
de ETS. Para agregar más, sigue el mismo formato: el módulo lo toma solo.
"""

# Complete the Words: párrafos académicos cortos. El módulo les quita la mitad final a palabras de la 2ª oración en adelante.
PARRAFOS = [
    ('Bees', "Bees are essential to many ecosystems. They carry pollen from one flower to another, which allows plants to "
             "produce seeds and fruit. Without this process, many crops that humans depend on would produce much less food. "
             "In recent years, scientists have observed a decline in bee populations around the world."),
    ('Sleep', "Sleep plays a central role in learning. During deep sleep, the brain organizes the information it received "
              "during the day and stores the most important parts. Students who sleep well after studying usually remember "
              "more than students who stay awake all night. For this reason, many teachers recommend regular sleep schedules."),
    ('Deserts', "Deserts are not empty places. Many plants and animals have developed special ways to survive with very "
                "little water. Some cacti store water in their thick stems, while certain lizards are active only at night "
                "when the air is cooler. These adaptations show how life can succeed in difficult conditions."),
    ('Printing', "The printing press changed the history of communication. Before its invention, books were copied by hand, "
                 "so they were rare and expensive. Printing made books cheaper and faster to produce, and more people "
                 "learned to read. As a result, new ideas spread across Europe much more quickly than before."),
    ('Volcanoes', "Volcanoes can be both destructive and helpful. An eruption may destroy towns and forests in a few hours. "
                  "However, volcanic ash eventually creates soil that is very rich in minerals. Farmers in many regions "
                  "choose to live near volcanoes because their land produces large harvests."),
    ('Memory', "Human memory is not like a video camera. When people remember an event, they rebuild it from small pieces of "
               "information. Each time a memory is recalled, it can change slightly. This explains why two witnesses of the "
               "same accident often describe it in different ways."),
    ('Cities', "Modern cities are growing faster than ever. More than half of the world population now lives in urban areas. "
               "This growth creates opportunities for jobs and education, but it also causes problems such as traffic and "
               "pollution. Planners are looking for ways to make cities greener and easier to live in."),
    ('Coral', "Coral reefs cover a small part of the ocean floor. Even so, they provide a home for about a quarter of all "
              "marine species. Corals are very sensitive to changes in water temperature. When the water becomes too warm, "
              "they lose the algae that give them color and food, a process known as bleaching."),
]

# Build a Sentence: oraciones correctas (el módulo las revuelve). Contexto de campus y vida diaria, como en el examen.
ORACIONES = [
    ('¿Dónde está la biblioteca?', 'Could you tell me where the library is?'),
    ('Pregunta por la tarea', 'Did you finish the assignment for tomorrow?'),
    ('El profesor y el examen', 'The professor wants to know when you can take the exam.'),
    ('Reunión del grupo', 'I was wondering if we could meet after class.'),
    ('La cafetería', 'The cafeteria closes earlier on weekends.'),
    ('Préstamo de libro', 'Do you know how long I can keep this book?'),
    ('Horario', 'Have you decided which courses you are going to take?'),
    ('Laboratorio', 'The lab report has to be submitted by Friday.'),
    ('Ayuda con un tema', 'Can you explain what the professor meant by that?'),
    ('Club', 'She asked me whether I wanted to join the club.'),
    ('Clima', 'The field trip was canceled because of the storm.'),
    ('Beca', 'I need to find out if I qualify for the scholarship.'),
    ('Presentación', 'Our presentation went better than we expected.'),
    ('Dormitorio', 'My roommate has been studying in the library all week.'),
    ('Notas', 'Do you remember where you put your notes?'),
    ('Tutor', 'The tutor suggested that I review the first chapter again.'),
    ('Inscripción', 'You should register before the deadline.'),
    ('Seminario', 'It would be helpful if you shared the slides with us.'),
    ('Clase cancelada', 'Nobody told me that the class had been moved.'),
    ('Investigación', 'They are still collecting data for the research project.'),
]

# Read in Daily Life / Read an Academic Passage: (tipo, título, texto, [(pregunta, [opciones], índice_correcto, por qué)])
LECTURAS = [
    ('vida diaria', 'Notice: Library hours',
     "Starting Monday, the main library will open at 7 a.m. instead of 8 a.m. on weekdays. Weekend hours will not change. "
     "During the final exam period, the second floor will stay open until 2 a.m. for quiet study only. Group study rooms "
     "must be reserved online at least one day in advance, and each reservation is limited to three hours.",
     [('What is changing starting Monday?', ['Weekend hours', 'The weekday opening time', 'The rules for group rooms', 'The location of the library'], 1,
       'El aviso dice que entre semana abrirá a las 7 en lugar de las 8. Lo del fin de semana «will not change».'),
      ('What is true about the second floor during exams?', ['It is only for group work', 'It closes at midnight', 'It is reserved for quiet study', 'It requires a reservation'], 2,
       '«will stay open until 2 a.m. for quiet study only».'),
      ('How should a student get a group room?', ['Arrive early on the same day', 'Ask a librarian', 'Book it online a day before', 'Reserve it for a full day'], 2,
       '«must be reserved online at least one day in advance». Además el límite es de 3 horas, no un día.')]),
    ('vida diaria', 'Email from a professor',
     "Hi everyone, I have to attend a conference on Thursday, so our class will not meet that day. Instead, please watch the "
     "recorded lecture that I will post on the course website by Wednesday night. The quiz that was planned for Thursday "
     "will take place next Tuesday at the beginning of class. Let me know if you have any questions. — Dr. Morales",
     [('Why is the professor writing?', ['To cancel the quiz', 'To explain a change in the schedule', 'To invite students to a conference', 'To announce a new course'], 1,
       'El correo explica que no habrá clase el jueves y qué hacer en su lugar: un cambio de horario.'),
      ('What should students do for Thursday?', ['Go to the conference', 'Take the quiz online', 'Watch a recorded lecture', 'Meet in another room'], 2,
       '«please watch the recorded lecture».'),
      ('When will the quiz happen?', ['Thursday', 'Wednesday night', 'Next Tuesday', 'It was canceled'], 2,
       '«will take place next Tuesday at the beginning of class». No se cancela, se mueve.')]),
    ('académica', 'The Urban Heat Island',
     "Cities are often several degrees warmer than the countryside around them, a phenomenon known as the urban heat island. "
     "Dark surfaces such as asphalt and roofs absorb sunlight during the day and release the heat slowly at night. In "
     "addition, cities have fewer trees, which normally cool the air by providing shade and releasing water vapor. Heat from "
     "cars, factories, and air conditioners adds to the problem. Some cities have started to paint roofs white and plant "
     "more trees. Early studies suggest that these simple measures can lower local temperatures noticeably.",
     [('What is the passage mainly about?', ['How to build cooler cars', 'Why cities are warmer and how to reduce it', 'The history of asphalt', 'Why the countryside is losing trees'], 1,
       'Explica la causa (superficies oscuras, pocos árboles, calor de máquinas) y luego soluciones: idea principal.'),
      ('According to the passage, how do trees cool the air?', ['By absorbing heat at night', 'By blocking wind', 'By giving shade and releasing water vapor', 'By reflecting light like white roofs'], 2,
       '«cool the air by providing shade and releasing water vapor».'),
      ('The word "noticeably" in the last sentence is closest in meaning to:', ['clearly', 'slowly', 'rarely', 'secretly'], 0,
       '«Noticeably» = de forma que se nota, claramente.')]),
    ('académica', 'Animal Migration',
     "Every year, millions of animals travel long distances between the places where they feed and the places where they "
     "reproduce. Arctic terns, for example, fly from the Arctic to Antarctica and back, the longest migration of any bird. "
     "Scientists believe that migrating animals use several sources of information to find their way, including the position "
     "of the sun, the stars, and the Earth's magnetic field. Young animals of some species migrate alone, which suggests that "
     "part of this ability is inherited rather than learned.",
     [('Why does the author mention Arctic terns?', ['To show an example of an extremely long migration', 'To explain how birds reproduce', 'To compare birds and fish', 'To describe the Arctic climate'], 0,
       'Se mencionan «for example» como el caso de la migración más larga.'),
      ('What can be inferred from the fact that some young animals migrate alone?', ['They learn from their parents', 'Part of the ability is genetic', 'They do not need the sun', 'They migrate shorter distances'], 1,
       '«suggests that part of this ability is inherited rather than learned» = genético.'),
      ('Which is NOT mentioned as a source of information?', ['The sun', 'The stars', 'The magnetic field', 'The smell of the ocean'], 3,
       'Las preguntas NOT: el olor del océano no aparece en el texto.')]),
]

# Write an Email: (situación, [3 cosas que debe hacer], palabras clave para revisar que cubrió cada punto)
CORREOS = [
    ("You borrowed a book from your classmate Alex, but you accidentally damaged it. Write an email to Alex.",
     ['Explain what happened', 'Apologize', 'Offer a solution'],
     [['happened', 'accident', 'spilled', 'dropped', 'damaged', 'broke', 'rain', 'coffee', 'water', 'tore'],
      ['sorry', 'apologize', 'apologies', 'feel bad', 'my fault'],
      ['buy', 'replace', 'pay', 'new copy', 'new one', 'fix', 'give you', 'offer']]),
    ("Your study group meets every Monday, but you have a new part-time job on Mondays. Write an email to the group.",
     ['Explain the problem', 'Suggest a different day or time', 'Say how you will stay involved'],
     [['job', 'work', 'shift', 'monday', 'cannot', "can't", 'problem'],
      ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'evening', 'morning', 'instead', 'how about', 'could we'],
      ['notes', 'share', 'online', 'video', 'call', 'catch up', 'send', 'help', 'involved']]),
    ("The campus gym closes at 8 p.m., which is too early for many students. Write an email to the director of student services.",
     ['Describe the problem', 'Explain why it matters to students', 'Propose a change'],
     [['close', 'closes', '8', 'early', 'problem', 'hours'],
      ['students', 'classes', 'work', 'health', 'stress', 'busy', 'because', 'important'],
      ['propose', 'suggest', 'open', 'later', 'extend', '10', '11', 'weekend', 'could', 'would']]),
    ("You want to take a course that is full. Write an email to the professor.",
     ['Introduce yourself', 'Explain why you want to take the course', 'Ask if there is a way to join'],
     [['my name', 'i am', "i'm", 'student', 'major', 'year'],
      ['because', 'interested', 'career', 'degree', 'need', 'requirement', 'passion', 'want to learn'],
      ['waitlist', 'wait list', 'join', 'possible', 'add', 'space', 'permission', 'any way', 'could i', 'would it be']]),
]

# Writing for an Academic Discussion: (pregunta del profesor, (nombre, postura), (nombre, postura))
DISCUSIONES = [
    ("Some people think universities should require all students to take a course in personal finance. Others think students "
     "should choose their own courses. What is your opinion, and why?",
     ('Kelly', "I think it should be required. Many young people get into debt because they never learned how credit cards work."),
     ('Paul', "I disagree. Students can learn this online for free, and required courses take time away from their major.")),
    ("Should cities invest more money in public transportation or in building new roads? Explain your view.",
     ('Andrew', "Public transportation is better because it reduces traffic and pollution at the same time."),
     ('Maria', "In many places people live far from bus routes, so new roads are still necessary.")),
    ("Is it better for students to study alone or in groups? Use reasons and examples.",
     ('Lena', "Groups are better because you can learn from other people's ideas and explanations."),
     ('Josh', "Studying alone is more efficient. In groups people often talk about other things and waste time.")),
    ("Some companies let employees work from home permanently. Is this a positive trend for society?",
     ('Sara', "Yes, it saves commuting time and lets people spend more time with their families."),
     ('Tom', "Not completely. Working from home can make people feel isolated and reduce teamwork.")),
]

# Speaking · Listen and Repeat (Capri las lee en voz alta con la voz en inglés de tu PC)
REPETIR = [
    'Welcome to the student center.', 'The bookstore is on the first floor.', 'Please sign in at the front desk.',
    'The next tour begins at ten o\'clock.', 'Remember to bring your student ID card.', 'Lunch is served until two in the afternoon.',
    'The computer lab is closed for maintenance today.', 'You can borrow up to five books at a time.',
    'Our first meeting will be held in room two hundred.', 'Please turn off your phone before the lecture starts.',
    'Applications for the summer program are due next month.', 'The professor posted the reading list on the website.',
    'If you have any questions, ask one of the assistants.', 'The shuttle bus leaves every fifteen minutes.',
    'Lost items can be picked up at the information desk.',
]

# Speaking · Take an Interview
ENTREVISTA = [
    'Tell me about a place in your city that you like to visit.', 'What do you usually do to relax after a busy day?',
    'Describe a teacher who had an important influence on you.', 'Do you prefer to study in the morning or at night? Why?',
    'What is a skill you would like to learn in the future?', 'Tell me about a book or movie that you recommend.',
    'How has technology changed the way people communicate?', 'Should young people travel before they start working? Why or why not?',
    'What is the best advice you have ever received?', 'Describe a challenge you faced and how you solved it.',
    'Do you think online classes are as effective as classes in person?', 'What would you change about your school or job?',
]

# Vocabulario académico (palabra | significado | ejemplo)
VOCAB = """
analyze|analizar|Scientists analyze the data carefully.
approach|enfoque; acercarse|This approach solves the problem faster.
assume|suponer|Don't assume the answer is always A.
benefit|beneficio|Exercise has many health benefits.
concept|concepto|The concept is easy to understand.
consist of|consistir en|The test consists of four sections.
constitute|constituir|Women constitute half of the class.
context|contexto|Guess the meaning from the context.
data|datos|The data show a clear trend.
define|definir|How do you define success?
derive|derivar, obtener de|Many words derive from Latin.
distribute|distribuir|The teacher distributed the exams.
environment|medio ambiente; entorno|We must protect the environment.
establish|establecer|The university was established in 1910.
estimate|estimar, calcular|We estimate the cost at 100 dollars.
evidence|evidencia, pruebas|There is no evidence for that claim.
factor|factor|Price is an important factor.
function|función; funcionar|The heart's function is to pump blood.
identify|identificar|Identify the main idea of the passage.
indicate|indicar|The results indicate a problem.
interpret|interpretar|It is hard to interpret this graph.
involve|implicar, involucrar|The job involves a lot of travel.
issue|asunto, problema|Pollution is a serious issue.
major|principal; carrera universitaria|My major is biology.
method|método|This method is more accurate.
occur|ocurrir|Earthquakes occur without warning.
percent|por ciento|Ten percent of students failed.
period|periodo|The Jurassic period lasted millions of years.
policy|política, norma|The school changed its policy.
principle|principio|The basic principle is simple.
procedure|procedimiento|Follow the safety procedure.
process|proceso|Learning a language is a long process.
require|requerir|The course requires a lot of reading.
research|investigación|She does research on climate change.
role|papel, función|Teachers play an important role.
significant|significativo, importante|There was a significant increase.
similar|parecido|The two theories are similar.
source|fuente|Always cite your sources.
specific|específico|Give a specific example.
structure|estructura|The structure of the essay is clear.
theory|teoría|Darwin's theory changed biology.
vary|variar|Prices vary from store to store.
achieve|lograr|She achieved her goal.
acquire|adquirir|Children acquire language quickly.
affect|afectar|Stress can affect your sleep.
alternative|alternativa|Is there an alternative solution?
aspect|aspecto|Consider every aspect of the problem.
category|categoría|Put the words into categories.
consequence|consecuencia|Every decision has consequences.
contribute|contribuir|Everyone contributed to the project.
crucial|crucial|Sleep is crucial for memory.
decline|disminuir; disminución|Bee populations are declining.
demonstrate|demostrar|The experiment demonstrates the effect.
despite|a pesar de|Despite the rain, we went out.
emerge|surgir|New problems emerged later.
emphasize|enfatizar|The author emphasizes the risks.
ensure|asegurar|Please ensure the door is locked.
evaluate|evaluar|We need to evaluate the results.
evolve|evolucionar|Species evolve over time.
exceed|exceder, superar|The cost exceeded our budget.
expand|expandir|The company expanded to Asia.
feature|característica|This phone has a new feature.
furthermore|además|Furthermore, it is cheaper.
however|sin embargo|It was hard; however, we finished.
hypothesis|hipótesis|Test your hypothesis with data.
impact|impacto|Technology has a huge impact on society.
imply|implicar, dar a entender|What does the author imply?
initial|inicial|The initial results were promising.
maintain|mantener|It is hard to maintain a routine.
moreover|además|Moreover, it saves time.
obtain|obtener|You must obtain permission first.
perspective|perspectiva|Try to see it from her perspective.
potential|potencial|The idea has great potential.
previous|anterior|As stated in the previous paragraph...
primary|principal, primario|The primary goal is safety.
range|rango, variedad|A wide range of topics.
rely on|depender de|Plants rely on bees.
resource|recurso|Water is a limited resource.
response|respuesta|The response was positive.
reveal|revelar|The study reveals a pattern.
sequence|secuencia|Put the events in sequence.
shift|cambio; cambiar|There was a shift in public opinion.
sufficient|suficiente|Is the evidence sufficient?
sustain|sostener|The land cannot sustain more cattle.
therefore|por lo tanto|It rained; therefore, the game stopped.
thus|así, por lo tanto|Thus, the theory is correct.
trend|tendencia|There is a trend toward remote work.
ultimately|al final, en última instancia|Ultimately, it is your decision.
whereas|mientras que|I like tea, whereas she likes coffee.
widespread|extendido, generalizado|The disease became widespread.
adapt|adaptarse|Animals adapt to their environment.
abundant|abundante|Water is abundant here.
accurate|preciso, exacto|The map is not accurate.
adequate|adecuado|We need adequate time to prepare.
advocate|defender, abogar por|She advocates for animal rights.
ambiguous|ambiguo|The question was ambiguous.
anticipate|anticipar, prever|We anticipate some problems.
arbitrary|arbitrario|The rule seems arbitrary.
coherent|coherente|Write a coherent paragraph.
compensate|compensar|Nothing can compensate for the loss.
comprehensive|completo, exhaustivo|A comprehensive review of the topic.
controversial|polémico|It is a controversial decision.
convey|transmitir|Music can convey emotions.
deliberately|a propósito|He deliberately ignored the rule.
diminish|disminuir|The pain diminished over time.
dominant|dominante|English is the dominant language online.
enhance|mejorar|Practice enhances performance.
eventually|finalmente (no «eventualmente»)|Eventually, she passed the exam.
explicit|explícito|The instructions were explicit.
inevitable|inevitable|Change is inevitable.
inherent|inherente|There are inherent risks.
notion|noción, idea|The notion of time is relative.
phenomenon|fenómeno|Rainbows are a natural phenomenon.
precise|preciso|Give a precise answer.
prevalent|frecuente, común|The flu is prevalent in winter.
profound|profundo|It had a profound effect on me.
reluctant|reacio|He was reluctant to help.
subsequent|posterior|Subsequent studies confirmed it.
undergo|someterse a, pasar por|The city underwent major changes.
valid|válido|That is a valid point.
"""
