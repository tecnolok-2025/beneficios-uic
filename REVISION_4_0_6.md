# REVISIÓN v4.0.6

Fecha: 08/11/2026

## Alcance
- Se incorporan exactamente 50 correos corporativos validados desde los exportes de Mailchimp de 2 estrellas.
- No se incorporan contactos de 3 o 4 estrellas porque el cruce previo confirmó cobertura completa en v4.0.5.
- Los correos Gmail/Hotmail/Yahoo y equivalentes no se incorporan en esta versión.
- Los contactos de empresas ya existentes reutilizan exactamente el mismo `companyName` del padrón para evitar empresas duplicadas.
- Las empresas nuevas se crean sólo cuando el dominio permite una identificación clara.
- Cinco casillas institucionales históricas fueron admitidas tras una segunda revisión conservadora.

## Contactos incorporados

1. **AXION ENERGY** — `patricia.hutter@axionenergy.com` — Patricia Hutter
2. **ARAUCO** — `daiana.pattarini@arauco.com` — Daiana Pattarini Arauco
3. **ARAUCO** — `raul.galindez@arauco.com`
4. **BANCO COLUMBIA** — `lopez.brenda@bancocolumbia.com.ar` — Brenda Lopez
5. **BANCO COLUMBIA** — `ferrari.carla@bancocolumbia.com.ar` — Carla Ferrari Menossi
6. **BANCO COLUMBIA** — `arona.maria@bancocolumbia.com.ar` — Florencia Arona
7. **BANCO COLUMBIA** — `tulian.vanina@bancocolumbia.com.ar` — vanina tulian
8. **CAMPARI ARGENTINA** — `sebastian.ferreira@campari.com`
9. **FAEN** — `leandro.completa@faen.com.ar`
10. **GÖTTERT** — `fernando@gottert.com.ar`
11. **GÖTTERT** — `cecilia@gottert.com.ar`
12. **EDELFLEX** — `mh@edelflex.com`
13. **DON FIORAVANTI** — `embalajes@donfioravanti.com.ar`
14. **SOFTYS** — `mfenoglio@softys.com`
15. **ZARCAM** — `fernando.rodriguez@zarcam.com.ar`
16. **ZARCAM** — `solana.carvajal@zarcam.com.ar`
17. **TRAFIGURA** — `martin.mutto@trafigura.com`
18. **HONDA MOTOR DE ARGENTINA** — `matias_bassi@honda.com.ar`
19. **HONDA MOTOR DE ARGENTINA** — `cynthia_lazcano@honda.com.ar` — Cynthia Lazcano Honda Motos
20. **ECOSAN** — `lclapcich@ecosan.com.ar`
21. **TRANSPORTE MILANA** — `administracion@transportemilana.com.ar`
22. **ALSER LOGÍSTICO** — `sergio.olivencia@alserlogistico.com` — Sergio Olivencia
23. **INDUSTRIAS GUIDI** — `j.liguori@industriasguidi.com.ar` — Javier Liguori Industrial Guidi
24. **TMB** — `gpiperata@tmbsa.com.ar` — Gabriela Piperata TMB
25. **PAN AMERICAN ENERGY** — `nmassetto@pan-energy.com` — Nicolás Masetto PAE
26. **NUCLEOELÉCTRICA ARGENTINA S.A.** — `lsgaitan@na-sa.com.ar` — Lucía Gaitan NASA
27. **TECHINT** — `facundo.sainato@techint.net`
28. **INMOBILIARIA CADEMA SA** — `agentile@cademaprop.com.ar` — Aldo Gentile Cadema
29. **RAYBITE INGENIERIA** — `a.raymundo@raybite.com`
30. **TECMACO INTEGRAL SA** — `apena@tecmaco.com.ar` — Alfredo Peña Tecmaco
31. **Toyota** — `cciardelli@toyota.com.ar` — Carla Toyota
32. **Toyota** — `agiordano@toyota.com.ar` — Amalio Giordano Toyota
33. **Toyota** — `sfranchini@toyota.com.ar` — Silvio Franchini Toyota
34. **GRUPO SOLPER** — `mbarreda@gruposolper.com` — Manuel Barreda
35. **UTN Facultad Regional Delta** — `anicolosi@frd.utn.edu.ar` — Alfredo Nicolosi UTN Delta
36. **UTN Facultad Regional Delta** — `carrizon@frd.utn.edu.ar` — Nanci Carrizo UTN Delta
37. **UTN Facultad Regional Delta** — `farinac@frd.utn.edu.ar` — Carlos Farina UTN Delta
38. **UTN Facultad Regional Delta** — `jtorga@frd.utn.edu.ar` — Jorge Torga UTN Delta
39. **GENBA-KAI CONSULTING** — `fernando.benitez@genbakai.com` — Fernando Benitez Gemba Kai
40. **INDUSTRIAS QUIMICAS DEM SA** — `sofia.cairo@demsa.com.ar`
41. **INDUSTRIAS QUIMICAS DEM SA** — `salvador.crespo@demsa.com.ar`
42. **INTECO ARGENTINA** — `ana_gomez@intecoargentina.com` — Ana Gomez
43. **ADIMRA** — `mfernandez@adimra.org.ar`
44. **ASOCIACIÓN DE COOPERATIVAS ARGENTINAS** — `vpicchi@acacoop.com.ar` — Victor Picchi
45. **ASOCIACIÓN BONAERENSE DE LA INDUSTRIA NAVAL** — `secretariabin@industrianaval.org` — secretaria ABIN
46. **AMEGHINO SERVICIOS NAVAL E INDUST** — `ameghino@ameghinoservicios.com.ar`
47. **I-MEGA INGENIERIA** — `info@i-mega.com.ar`
48. **ELINSUR** — `informacion@elinsur.com`
49. **SENDECO** — `cobranzas@sendeco.com.ar`
50. **TECMACO INTEGRAL SA** — `alopez@tecmaco.com.ar` — Angel Fernando Lopez Tecmaco

## Seguridad de migración
- El importador de `diffusion_recipients` mantiene la regla de no insertar un `socio_confirmar` cuando el mismo e-mail ya existe.
- No se borra ni se reemplaza ningún contacto previo.
- No se modifican campañas, bajas, historial de envíos ni beneficios.
