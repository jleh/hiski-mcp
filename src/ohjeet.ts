/**
 * Guidance for the agent, sent as the server's `instructions`. Tool
 * descriptions stay factual; how to search well lives here.
 */
export const OHJEET = `HisKi on Suomen Sukututkimusseuran tietokanta, johon on tallennettu seurakuntien historiakirjojen tapahtumia: kastetut, vihityt, haudatut sekä sisään- ja poismuuttaneet. Tiedot ovat alkuperäisessä kirjoitusasussa, usein ruotsiksi.

Aineiston rajat:
- Tietoja ei ole ennen vuotta 1648 eikä 1900-luvulta, ja näkyvissä ovat vain yli 100 vuotta vanhat tapahtumat. Kunkin seurakunnan ja kirjan indeksoidut vuodet kertovat etsi_seurakunta ja seurakunnan_tiedot; aineisto voi olla vajaa niidenkin sisällä.
- Tyhjä tulos ei todista, ettei tapahtumaa ole. Silloin voi kokeilla toista kirjoitusasua, naapuriseurakuntia (seurakunnan_tiedot), emäseurakuntaa tai toista kirjaa (esim. vihityt, kun kastetta ei löydy).
- Luovutetun Karjalan seurakuntien historiakirjat on pääosin tallennettu Karjala-tietokantasäätiön tietokantaan (karjalatk.fi), ei Hiskiin.
- Tallennuksessa voi olla virheitä; löydöt kannattaa tarkistaa alkuperäislähteestä (SSHY-digiarkiston linkki hae_tapahtuma-tuloksessa).

Hakusanat:
- Nimet haetaan nykyisellä perusmuodolla; Hiski löytää myös vanhat ja ruotsinkieliset muodot (Johan löytää myös Juho, Johannes). Tuloksen hakutermit kertovat, mitä muotoja haettiin, ja jos hakusanaa ei ole tietokannassa.
- Useampi etunimi välilyönnillä tarkoittaa, että kaikkien on löydyttävä (enintään 3). Vaihtoehdot erotetaan sanalla TAI, esim. "Jussi TAI Matti".
- Patronyymi toimii päätteen kanssa tai ilman (Johan, Johansson, Juhonpoika); varmin on ruotsinkielinen -son/-dr.
- Sukunimien normalisointi on puutteellinen: noin 5 alkukirjainta toimii usein parhaiten (Manko löytää Mankonen ja Mankoin). Länsi-Suomessa sukunimeä ei usein ollut, ja sukunimikenttään on voitu kirjata talon nimi.
- Paikannimiä ei ole normalisoitu kattavasti; alkuperäinen kirjoitusasu tai sanan alku toimii usein paremmin. Kylien nimet ovat kirjoissa usein ruotsiksi tai vanhassa asussa (Niemi → Njemis); seurakunnan_tiedot listaa kylät.
- Hakusanan loppuun lisätään automaattisesti jokeri: "Kuona" löytää myös "Kuonan torppa". Piste lopussa hakee tarkasti ("Berg."). * on mikä tahansa merkkijono ja ? yksi merkki; sanan alussa oleva jokeri on hidas usean seurakunnan haussa. $ alussa hyväksyy myös tapahtumat, joissa kenttä on tyhjä ("$Mikkola").

Hakutapa:
- Kun seurakunta tiedetään, haku yhdestä seurakunnasta on nopein ja tarkin. Usean seurakunnan haussa ehtoja kannattaa tarkentaa ja pitää maksimi pienenä.
- Hakutuloksessa henkilö on yksi merkkijono (ammatti ja nimet yhdessä); hae_tapahtuma antaa ammatin, etunimen, patronyymin, sukunimen ja iän eriteltyinä sekä kommentit.
- Katkaistun tuloksen voi jatkaa jatkokohdalla samalla haulla samalle seurakunnalle. hae_kaikki-hakua ei voi jatkaa; sen katkennutta kirjaa voi hakea kirjan omalla työkalulla.
- hae_kaikki hakee henkilöä kaikista kirjoista kerralla; se sopii ensimmäiseksi hauksi, kun tiedossa on vain nimi ja seurakunta.`;
