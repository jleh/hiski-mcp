# Hiski MCP – toteutussuunnitelma

## Konteksti

Hiski (hiski.genealogia.fi) on vanha lomakepohjainen palvelu, josta haetaan kastettuja, vihittyjä ja haudattuja seurakunnittain. Rakennetaan MCP-palvelin, jonka kautta tekoälyagentti voi tehdä haut ja saada tulokset jäsenneltynä (JSON), ei HTML:nä. Lähtötilanteessa hakemistossa oli vain `suunnitelma.md` ja `seurakunnat.txt` (539 `<OPTION VALUE="koodi">Nimi`-riviä). Jälkimmäinen on poistettu osassa 2, koska seurakuntadata tulee nyt Hiskistä (osa 1).

Tavoite käyttöönotolle: Claude Desktopin peruskäyttäjä asentaa yhdellä tuplaklikkauksella (.mcpb), kehittäjät käyttävät `npx`:llä Claude Codessa, Codexissa ym.

## Palvelusta varmistetut havainnot (testattu curlilla)

- Haku: `POST https://hiski.genealogia.fi/hiski`, form-urlencoded, `komento=haku&srk=…&kirja=kastetut|vihityt|haudatut&kieli=fi&maxkpl=…` + kenttäparametrit. Vastaus on **ISO-8859-1** → dekoodataan `TextDecoder('latin1')`, ja pyynnön ä/ö-merkit enkoodataan latin-1:nä (%E4 jne.).
- **Usea seurakunta**: `srk=0366,0015` (pilkuilla) toimii. Tulokset tulevat seurakunnittain lohkoina: otsikko `<FONT SIZE="+2"><B>Nimi - kirja</B>`, `<UL><LI>`-lista hakutermien laajennuksista (esim. `JOHAN => Johan, Johannes`), taulukko, `N tapahtumaa löytyi.`, lopussa `Seurakunnista löytyi yhteensä N tapahtumaa.`
- Tulosrivin 1. solussa linkki `/hiski?fi+0366+kastetut+18795` (srk, kirja, tapahtumanumero). Sarakkeet:
  - kastetut: Syntynyt, Kastettu, Kylä, Talo, Isä, Äiti, Lapsi (äidin solussa voi olla ikä perässä)
  - vihityt: Kuul., Vihitty, Kylä, Talo, Mies, Vaimo, Kylä, Talo
  - haudatut: Kuollut, Haudattu, Kylä, Talo, Henkilö, Kuolinsyy, Ikä vv/kk/vko/pv; lisäksi kommenttirivit `<TD COLSPAN=9>… ALKUPKOMM: <SMALL>…`, jotka kuuluvat edelliseen tapahtumaan
- Tapahtuman tiedot: `GET /hiski?fi+0366+kastetut+18795` → taulukko (Syntynyt/Kastettu, Kylä/Talo, Isä: ammatti/etunimi/patronyymi/sukunimi…, Äiti, Lapsi, Oma komm., Alkup. komm., Linkit → SSHY-digiarkisto) sekä pysyvä linkki `/hiski?fi+t10320690`.
- HTML on huonosti muotoiltua (sulkemattomat `<TR>/<TD>`) → käytetään sallivaa jäsennintä (cheerio / htmlparser2).

## Teknologia

TypeScript (ESM, Node ≥ 20), `@modelcontextprotocol/sdk` (stdio), `zod` (työkalujen skeemat), `cheerio`, natiivi `fetch`. Testit: `vitest`. Buildaus `tsc` (tai `tsup`), jotta npm- ja .mcpb-paketti on yksi `dist/index.js`. Paketointi .mcpb:ksi `@anthropic-ai/mcpb`-työkalulla (`mcpb pack`).

## Rakenne

```
package.json            # bin: hiski-mcp → dist/index.js
tsconfig.json, vitest.config.ts
manifest.json           # .mcpb-manifest (server.type = node)
README.md
src/
  index.ts              # käynnistys: McpServer + StdioServerTransport
  server.ts             # työkalujen rekisteröinti (testattava ilman stdiota)
  client.ts             # HTTP: haku (POST), tapahtuma (GET), latin-1, User-Agent, timeout
  parser.ts             # hakutulos-HTML → seurakuntalohkot → rivit; tapahtumasivu → kentät
  parishes.ts           # seurakuntalista + sumea nimihaku
  data/seurakunnat.json # generoitu data: kokonaiset nimet + indeksoidut vuodet kirjoittain (scripts/paivita-seurakunnat.ts)
test/
  fixtures/*.html       # tallennetut oikeat vastaukset
  *.test.ts
```

## MCP-työkalut

1. **`etsi_seurakunta(nimi)`**: palauttaa koodit, nimet ja kunkin kirjan indeksoidut vuodet (paikallisesta datasta, ei verkkokutsua). Haku osittaisella nimellä, kirjainkoolla ja diakriiteillä ei ole väliä, ja ruotsinkielinen nimi käy myös ("Artsjö"). Genetiivimuodot ("Turku" → "Turun …") löytyvät ehdokkaina.
   - _Toteutuksessa (osa 1) muutettu:_ `seurakunnat.txt`:n nimet on katkaistu 35 merkkiin, joten data haetaan Hiskin kirjaluettelosta, jossa kaikki seurakunnat on valittu kerralla. Siitä saadaan kokonaiset nimet ja vuosikattavuus. Skripti `npm run paivita-seurakunnat` päivittää datan ja testifixturen.
2. **`hae_kastetut(seurakunnat, lapsen_etunimi?, alkuvuosi?, loppuvuosi?, kyla?, isan_{etunimi,patronyymi,sukunimi,ammatti}?, aidin_…?, maksimi=50)`**
3. **`hae_vihityt(seurakunnat, alkuvuosi?, loppuvuosi?, miehen_{etunimi,patronyymi,sukunimi,ammatti,paikka}?, vaimon_…?, maksimi=50)`**
4. **`hae_haudatut(seurakunnat, alkuvuosi?, loppuvuosi?, {etunimi,patronyymi,sukunimi,ammatti,paikka,kuolinsyy}?, syntyma_alku?, syntyma_loppu?, ika?, omaisen_{etunimi,patronyymi,sukunimi,ammatti}?, maksimi=50)`**. `sukulaissuhde` jätetään pois, koska ohjeiden mukaan sitä ei ole kirjattu tietokantaan ja hakuehtona se on turha.
   4b. **`hae_muuttaneet(seurakunnat, suunta: "sisaan"|"pois", alkuvuosi?, loppuvuosi?, etunimi?, patronyymi?, sukunimi?, ammatti?, kyla?, toinen_seurakunta?, maksimi)`**: kirjat `smuutt` ja `umuutt`, joiden lomakekenttä on `ietunimi, ipatronyymi, isukunimi, iammatti, ikyla, kohde`. Lomakkeiden kenttien merkitys on käänteinen: smuutt-lomakkeessa `ikyla` = minne ja `kohde` = mistä, umuutt-lomakkeessa `ikyla` = mistä ja `kohde` = minne. Työkalu yhtenäistää tämän: `kyla` tarkoittaa aina tämän seurakunnan kylää ja `toinen_seurakunta` toista paikkakuntaa, jota `kohde`-kenttä vastaa. Tulosrivin sarakkeet ovat Lähtöpäivä, Saapumispäivä, Kylä, Talo, Henkilö, Kohde (sulkukommentteineen, esim. `Hauho (12.10.40.)`). Kuvaukseen lisätään, että muuttoluetteloita on vain osasta seurakuntia ja lyhyiltä ajoilta; tämän voi tarkistaa `seurakunnan_tiedot`illa.
   4c. **`hae_kaikki(seurakunnat, alkuvuosi?, loppuvuosi?, etunimi?, patronyymi?, sukunimi?, ammatti?, paikka?, vapaa_teksti_ja?, vapaa_teksti_ei?, maksimi)`**: kirja `kaikki`, lomakekentät `ietunimi, ipatronyymi, isukunimi, iammatti, ikyla, vapaaAND, vapaaNOT`. Henkilö haetaan kaikista kirjoista kerralla. Vastaus on seurakuntalohko, jossa on useita alitaulukoita, yksi kirjaa kohden. Jokainen tapahtuma saa `kirja`-kentän, joka päätellään rivin linkistä, ja rivi jäsennetään saman kirjakohtaisen logiikan avulla. Kuvaukseen kirjoitetaan, että tämä on hyvä ensimmäinen haku, kun tiedetään vain henkilön nimi ja seurakunta.
5. **`seurakunnan_tiedot(seurakunta)`**: yhdistää kaksi sivua. `etsi_seurakunta` pysyy kevyenä paikallisena hakuna, koska se voi palauttaa kymmeniä osumia.
   - **Hiskin seurakuntasivu** `GET /hiski?fi+0366` (latin-1) on sama sisältö kuin selaimen POST `srk=0366&kieli=fi&seurakunta=`; tämä on varmistettu, eikä evästeitä tarvita. Se on ainoa luotettava lähde sille, mitkä vuodet Hiskiin on indeksoitu: `<LI><A HREF="/hiski?fi+0366+kastetut">Kastetut</A> (1697-1710, 1718-1890)` jne. Kirjat jäsennetään yleisesti linkin kirjatunnuksesta, jolloin mukaan tulevat myös mahdolliset smuutt/umuutt/kaikki. Lisäksi sivulta saadaan naapuriseurakunnat **koodeineen** (`/hiski?fi+0015`) ja valmis "kaikki naapurit" -koodilista. Vuosivälit jäsennetään rakenteeksi `[{alku, loppu}]`, jolloin aukot (esim. isoviha 1711–1717) näkyvät.
   - **Seurakuntatietosivu**: URL otetaan edellisen sivun "Lisätietoja seurakunnasta" -linkistä (`/historia/mini-pgsql.php?srk=366&kieli=fi`, UTF-8). Jos linkkiä ei ole, osio jätetään pois. sisältää maakunnan, historiatekstin (perustaminen, emäseurakunta, arkistotuhot) ja **kylät** (mm. rinnakkaisnimet, esim. "Heinämaa (Hyyttäri)"). Mikrofilmi- ja pappisluettelot jätetään pois, koska ne ovat pitkiä eivätkä auta Hiski-haussa. Mustien kirjojen ja mikrofilmien vuodet (esim. "Syntyneet 1834-1847") kuvaavat alkuperäisaineistoa, eivät Hiskin indeksiä, eivätkä ne täsmää hakuvuosiin. Siksi ne jätetään kokonaan pois sekaannusten välttämiseksi.
   - Työkalun kuvaukseen kirjoitetaan agentille: haettava vuosi kannattaa tarkistaa indeksoiduista vuosista. Ilmoitetun välin sisälläkin aineisto voi olla vajaa, joten tyhjä tulos ei todista, ettei tapahtumaa ole ollut. Silloin kannattaa kokeilla naapuriseurakuntia, emäseurakuntaa tai digiarkistoa. Kylien nimet voivat kirjoissa olla ruotsiksi tai vanhassa asussa (Niemi → Njemis/Niemis).
6. **`hae_tapahtuma(seurakunta, kirja, numero)`**: tarkat tiedot (ammatti, nimi ja patronyymi eriteltyinä, kommentit, digiarkistolinkki, pysyvä linkki).

Yhteistä:

- `seurakunnat`: lista koodeja tai nimiä. Nimet ratkaistaan `parishes.ts`:llä; jos nimi on epäselvä, palautetaan virhe ja ehdokkaat.
- `maksimi` pyöristetään ylöspäin lähimpään sallittuun arvoon (15, 30, 50, 100, 250, 500, 1000).
- `maksimi` koskee jokaista seurakuntaa erikseen, ja palvelun kokonaisyläraja on 750. Usean seurakunnan haussa oletusarvo on siksi pienempi (15).
- `alkuvuosi`/`loppuvuosi` hyväksyvät myös muodot `pp.kk.vvvv` ja `kk.vvvv`. Vain toinen raja voidaan antaa. Arvot validoidaan zodilla.
- Paluuarvo (toteutettu osassa 3, `src/hakutulos.ts`): `{lohkot: [{seurakunta: {koodi, nimi}, kirja, hakutermit, huomautukset?, tapahtumat, katkaistu, loytyi_noin?, jatkokohta?}], yhteensa?}`. Kaikki-haussa jokainen kirja on oma lohkonsa. Tapahtumassa on `kirja`, `numero`, absoluuttinen `url`, kirjakohtaiset kentät (tyhjät jätetään pois), `kommentit` ja `kenttakommentit`. Hakutuloksessa henkilö on yksi merkkijono ("B. Johan Hansson"), koska Hiski yhdistää ammatin, etunimen, patronyymin ja sukunimen soluun niin, ettei rajoja voi päätellä. Eritellyt kentät tulevat `hae_tapahtuma`sta.
  - `katkaistu: true`, kun palvelu ilmoittaa, että tapahtumia löytyisi enemmän kuin tulostettiin. Ilmoituksia on kaksi (osa 2): yhden seurakunnan haussa "Tapahtumia löytyi noin N. Näytettiin M tapahtumaa.", usean seurakunnan haussa "Tapahtumia löytyi yli maksimimäärän (M tapahtumaa)."
  - `jatkokohta`: katkaistun lohkon perässä on "Jatka hakua" -lomake, jossa on `hakupos`. Sama haku yhdelle seurakunnalle `hakupos`-kentän kanssa jatkaa seuraavasta tapahtumasta. Hakutyökaluihin tulee parametri `jatka: {seurakunta, jatkokohta}`, joka ajaa haun vain sille seurakunnalle.
  - `ei_tietokannassa`: hakutermirivin "=> hakutekstiä ei löydy tietokannasta" perusteella parseri kertoo, mitä hakuehtoja ei tunneta. Agentti voi silloin kokeilla toista kirjoitusasua.
  - Tapahtuman kommentit rakenteena `{tyyppi: "alkup"|"oma", alikentta?, teksti}` (esim. `alkup - ALKUPKOMM: icke gift`, `{SYNPV}`, `SP` = sukupuoli, `MONIS` = monisynty). Kenttäkohtaiset suluissa olevat pikkukommentit, esim. `(N.d.)`, erotellaan omiksi `kommentti`-kentikseen.
  - Kastetut: äidin ikä erotetaan omaksi kentäkseen (`aidin_ika`, joka voi olla myös väli "25-30").

### Työkalujen kuvaukset (Hiskin ohjesivujen pohjalta)

Yhteinen hakuohje-teksti lisätään hakutyökalujen kuvaukseen, ja kenttäkohtaiset vinkit laitetaan zodin `.describe()`-kuvauksiin:

- **Normalisointi**: nimet haetaan nykyisellä perusmuodolla, ja palvelu löytää myös vanhat ja ruotsinkieliset kirjoitusasut (Johan löytää myös Juho, Juhani, Johannes). Tulokset palautetaan alkuperäisessä kirjoitusasussa. `hakutermit`-kentästä näkee, mitä muotoja haettiin.
- **Etunimi**: useampi nimi välilyönnillä tarkoittaa JA-ehtoa missä tahansa järjestyksessä (enintään 3 nimeä). Vaihtoehdot annetaan `TAI`-sanalla (esim. "Jussi TAI Matti").
- **Patronyymi**: voidaan antaa päätteen kanssa tai ilman (Johan, Johanson ja Juhonpoika toimivat kaikki). Varmin muoto on ruotsinkielinen -son/-dr.
- **Sukunimi**: normalisointi on puutteellinen, joten paras tapa on antaa noin viisi alkukirjainta (Manko löytää Mankonen ja Mankoin). Länsi-Suomessa sukunimeä ei usein ollut, ja sukunimikenttään on voitu kirjata talon nimi, joten kannattaa kokeilla talon nimeä sukunimenä tai toisin päin.
- **Paikka**: paikkoja ei ole normalisoitu kattavasti. Jos haku ei tuota tuloksia, kannattaa kokeilla alkuperäistä kirjoitusasua tai sanan alkua ja jokerimerkkejä.
- **Jokerimerkit**: hakusanan loppuun lisätään automaattisesti `*`. Piste lopussa (`Berg.`) tarkoittaa tarkkaa hakua. `*` ja `?` toimivat jokereina, mutta alussa olevaa jokeria ei pidä käyttää usean seurakunnan haussa, koska se on hidas. `$` alussa hyväksyy myös tapahtumat, joissa kenttä on tyhjä (esim. `$Mikkola`).
- **Aineiston rajat**: tietoja ei ole ennen vuotta 1648 eikä 1900-luvulta. Näkyvissä ovat vain yli 100 vuotta vanhat tapahtumat. Tiedoissa voi olla virheitä, joten löydöt kannattaa tarkistaa alkuperäislähteestä (digiarkistolinkki `hae_tapahtuma`sta).
- **Strategia**: jos seurakunta tiedetään, haetaan vain yhdestä seurakunnasta. Usean seurakunnan haussa hakuehtoja tarkennetaan ja `maksimi` pidetään pienenä. Ensin haetaan laajasti ja sitten tarkennetaan `hae_tapahtuma`lla. Jos kasteesta ei löydy tietoja, kannattaa kokeilla vihittyjä tai naapuriseurakuntia.
- **Kastetut**: 1600-luvulla äitiä ei aina ole merkitty. Äidin ikä on suuntaa-antava.
- **Haudatut**: omaisia ei ole tallennettu kaikissa seurakunnissa (tämän voi tarkistaa haulla ilman ehtoja, `maksimi` 15). Ikä on jaettu kenttiin vv/kk/vko/pv, ja murtoluvut on muunnettu (esim. ½ vuotta → 6 kk).

(Tilastot-kirja jätetään pois.)

## Toteutus osissa (git + TDD)

Jokainen osa kulkee saman putken läpi:

1. Osalle luodaan oma haara (`osa-1-seurakunnat` jne.) `main`-haarasta.
2. **TDD**: ensin epäonnistuva testi (vitest punainen) → minimitoteutus (vihreä) → siistiminen. Commitit tehdään pieninä.
3. **Code review**: `/code-review` ajetaan osan diffille `main`-haaraa vasten (taso medium, eli vain varmoja löydöksiä). Aiheelliset korjaukset tehdään omana commitinaan TDD:llä, eli bugille kirjoitetaan ensin testi. Löydökset, joita en korjaa, perustellaan.
4. Push ja PR (`gh pr create`). PR:n kuvaukseen tulee tiivistelmä osasta ja katselmoinnin löydöksistä. GitHub Actions -CI:n pitää mennä vihreäksi.
5. Pysähdyn ja raportoin tilanteen: mitä tehtiin, mitä review löysi ja PR-linkki. Mergeään (`gh pr merge --squash`) vasta, kun olet hyväksynyt osan, tai kun annat luvan jatkaa, ja siirryn sitten seuraavaan osaan.

Poikkeus: osa 0 (repo ja CI) commitoidaan suoraan `main`-haaraan, koska PR-putki syntyy vasta sen myötä.

0. **Repo, runko ja CI**: `git init` (haara `main`), `.gitignore`, `package.json`, `tsconfig.json`, vitest ja yksi savutesti, joka menee läpi. Lisäksi `.github/workflows/ci.yml`, joka ajetaan pushissa ja PR:ssä: `npm ci` → `tsc --noEmit` → `npm test` → `npm run build`, Node 22 ja 24 (Node 20 on EOL, vitest 5 vaatii ≥ 22). Commit (mukana myös suunnitelma.md). Sen jälkeen `gh repo create jleh/hiski-mcp --public --source . --push` ja tarkistus, että CI menee vihreäksi (`gh run watch`). Lisäksi `main`-haaralle asetetaan suojaus, joka vaatii vihreän CI:n ennen mergeä (`gh api` branch protection, jos julkinen repo sen sallii).
1. **Seurakunnat** (`parishes.ts`): ensin testit tiedoston jäsennykselle (539 kpl), koodihaulle, osittaiselle nimihaulle (kirjainkoko, diakriitit, ruotsinkielinen nimi), epäselvän nimen virheelle ehdokkaineen ja koodi/nimi-listan ratkaisulle. Commit.
2. **Fixturet** ✅: `scripts/fixturet.ts` (manifesti) ja `npm run tallenna-fixturet`. Havainnot on kirjattu alle kohtaan "Palvelun erityispiirteet".
3. **Hakutulosten parseri** ✅: kullekin kirjalle ensin testit lohkojaolle, hakutermeille (mukaan lukien "hakutekstiä ei löydy tietokannasta"), sarakkeille, tapahtumanumerolle, kommenttiriveille (`alkup - ALIKENTTÄ:`, myös OMA), sulkukommenteille (myös äidin ikää edeltävä), äidin iälle, `katkaistu`- ja `jatkokohta`-tiedoille (molemmat muodot), lukumäärille, tyhjälle tulokselle ja sivulle, jolla ei ole lohkoja. Parseri rakennetaan niin, että rivin kirja päätellään linkistä (`/hiski?fi+SRK+KIRJA+N`) ja rivi jäsennetään kirjakohtaisella mappauksella. Näin sama koodi toimii myös `kaikki`-haun sekataulukoille. Commit kirja kerrallaan (kastetut → vihityt → haudatut → smuutt/umuutt → kaikki).
4. **Tapahtumasivun parseri**: ensin testit fixtureja vasten (kastetut, vihityt, haudatut, smuutt). Tunnistetaan myös virhesivu ja olemattoman tapahtuman tyhjä sivu. Commit.
   4b. **Seurakuntatietojen parserit**: ensin testit seurakuntasivulle (kirjat ja vuosivälit aukkoineen, naapurit koodeineen, lisätietolinkki) ja mini-pgsql-sivulle (UTF-8; maakunta, historia, kylät, vanhat nimet; puuttuvat osiot ja "Ei löytynyt" eivät kaada). Commit.
5. **HTTP-client**: testeissä `fetch` injektoidaan ja mockataan. Testataan lomakedatan rakennus (tyhjät kentät, srk pilkuilla, maxkpl-pyöristys, latin-1-enkoodaus, `hakupos`), vuosien validointi (Hiski ohittaa virheellisen vuoden hiljaa), tapahtuman GET-url, **uudelleenyritys virhesivulle** (tapahtumasivut epäonnistuvat satunnaisesti, ks. alla) ja virhetilanteet (HTTP, Cloudflare-haaste). Commit.
6. **MCP-palvelin** (`server.ts`): testeissä yhdistetään `Client` ja `McpServer` SDK:n `InMemoryTransport`illa ja mockatulla clientillä. Tarkistetaan työkalulista, parametrien vastaavuus lomakekenttiin ja JSON-rakenne. Commit.
7. **Paketointi ja julkaisu-CI**: build, `manifest.json`, `mcpb pack` → `hiski-mcp.mcpb`, npm-valmius (`bin`, `files`, `repository`, `license`). CI:hin lisätään `mcpb validate` ja `npm pack --dry-run`. Uusi `.github/workflows/release.yml` käynnistyy `v*`-tagista: testit → build → `mcpb pack` → GitHub Release, jonka liitteenä on `hiski-mcp.mcpb` (`gh release create`) → `npm publish --provenance --access public` npm:n **Trusted Publishingin** (OIDC, `permissions: id-token: write`) kautta, joten `NPM_TOKEN`-secretiä ei tarvita. Tagin ja package.jsonin versio tarkistetaan yhtenevyyden varalta. `LICENSE` = MIT (Juuso Lehtinen). Commit.
   - **Ensimmäinen julkaisu** (vasta käyttäjän luvalla): `v0.1.0` julkaistaan npm:ään paikallisesti komennolla `npm publish --access public` (käyttäjä on kirjautunut, `npm whoami` = jleh), koska Trusted Publisherin voi määrittää vasta olemassa olevalle paketille. Sen jälkeen käyttäjä määrittää npmjs.com:ssa: hiski-mcp → Settings → Trusted Publisher → GitHub Actions, `jleh/hiski-mcp`, `release.yml`. Tagin `v0.1.0` push luo GitHub Releasen ja .mcpb:n; npm-askel ohitetaan, jos versio on jo julkaistu. Siitä eteenpäin julkaisu tapahtuu pelkällä tagilla.
8. **README ja live-testit**: live-testit (`npm run test:live`, eivät ole mukana oletusajossa) + README. Commit.

## Palvelun erityispiirteet (havaittu osassa 2)

- **Tapahtumasivut epäonnistuvat satunnaisesti:** noin puolet pyynnöistä `GET /hiski?fi+SRK+KIRJA+N` palauttaa sivun "Virhe parametrissa! Seurakuntaa/kirjaa ei löytynyt." tahdista riippumatta. Uusi yritys parin sekunnin päästä yleensä onnistuu. Sama virhe tulee myös aidosti virheellisestä kirjasta. Olematon tapahtumanumero palauttaa "toimivalta" palvelimelta sivun, jossa on otsikot mutta ei taulukkoa. → Client yrittää virhesivun kohdalla uudelleen muutaman kerran ja kertoo sitten, että tapahtumaa ei saatu.
- Haut ja seurakuntasivut toimivat luotettavasti myös tiheillä pyynnöillä.
- **Hiljaiset virheet:** virheellinen vuosi ohitetaan, ja tuntematon seurakunta tai kirja palauttaa sivun ilman tuloslohkoja.
- **Cloudflare** lisää jokaiseen sivuun pyyntökohtaisen skriptin ja sähköpostisuojauksen. `poistaCloudflareLisaykset` (src/encoding.ts) poistaa ne fixtureista.

## README (kohderyhmänä myös peruskäyttäjä)

1. **Claude Desktop – helppo tapa** (ensimmäisenä, selkokielellä, ei teknisiä termejä):
   - Lataa `hiski-mcp.mcpb` (suora linkki: `https://github.com/jleh/hiski-mcp/releases/latest/download/hiski-mcp.mcpb`).
   - Tuplaklikkaa tiedostoa, tai Claude Desktopissa: Asetukset → Laajennukset → vedä tiedosto ikkunaan → Asenna.
   - Tarkista, että Hiski näkyy laajennuksissa päällä.
   - Kokeile esimerkkikysymyksellä: "Hae Orimattilan kastetuista Johan Hanssonin ja Ottilia Andersdotterin lapset."
   - Vianetsintä: laajennus ei näy → käynnistä Claude uudelleen; ei tuloksia → kokeile laajempaa hakua.
2. **Esimerkkikysymyksiä** sukututkimukseen ja vinkit (ruotsinkieliset nimet, patronyymit).
3. **Kehittäjille**: Claude Code `claude mcp add hiski -- npx -y hiski-mcp`, Codex `codex mcp add hiski -- npx -y hiski-mcp` / `~/.codex/config.toml`, yleinen stdio-JSON muille asiakkaille, sekä buildaus lähdekoodista.

## Todentaminen

- GitHub Actions -CI vihreänä jokaisen osan pushin jälkeen.
- `npm test` (vitest: seurakunnat, parserit, client, palvelin; ei verkkoyhteyttä).
- `npm run test:live`: toistetaan suunnitelma.md:n esimerkki (Orimattila, Johan Hansson + Ottilia Andersdotter → 9 kastettua, Maria Sofia 1834 … Mathilda 1854), usean seurakunnan vihityt-haku (0366,0015 → 2 osumaa) , `hae_tapahtuma(0366, kastetut, 18795)` ja `seurakunnan_tiedot("Orimattila")` (kastetut 1718–1890, naapureissa Artjärvi 0015, kylissä Niemi).
- `npx @modelcontextprotocol/inspector node dist/index.js`: työkalujen käsinkokeilu.
- Rekisteröidään Claude Codeen ja kysytään agentilta sama haku luonnollisella kielellä; .mcpb:n asennus Claude Desktopiin testataan käsin.
