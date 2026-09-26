# HisKi-haut Claudelle (hiski-mcp)

Tämän laajennuksen avulla Claude (tai muu tekoälyavustaja) osaa hakea tietoja **HisKi-tietokannasta**: seurakuntien historiakirjoista kastetuista, vihityistä, haudatuista sekä sisään- ja poismuuttaneista. Voit kysyä tavallisella kielellä, ja Claude tekee haut puolestasi ja kokoaa tulokset.

Esimerkkejä kysymyksistä:

- _Hae Orimattilan kastetuista Johan Hanssonin ja Ottilia Andersdotterin lapset._
- _Milloin Maria Sofia syntyi, ja mitä hänen vanhemmistaan on merkitty?_
- _Mitkä ovat Artjärven naapuriseurakunnat, ja miltä vuosilta Hiskissä on niiden vihityt?_
- _Etsi Johan Hanssonia kaikista Orimattilan ja Artjärven kirjoista vuosilta 1850–1855._

> Tämä on harrastajan tekemä epävirallinen työkalu. Se **ei ole Suomen Sukututkimusseuran** tekemä tai ylläpitämä. Tiedot haetaan seuran julkisesta HisKi-palvelusta osoitteesta [hiski.genealogia.fi](https://hiski.genealogia.fi/hiski?fi).

## Asennus Claude Desktopiin

Tarvitset [Claude Desktop](https://claude.ai/download) -sovelluksen. Muuta ei tarvitse asentaa.

1. **Lataa laajennus:** [hiski-mcp.mcpb](https://github.com/jleh/hiski-mcp/releases/latest/download/hiski-mcp.mcpb)
2. **Avaa ladattu tiedosto** tuplaklikkaamalla. Claude Desktop avaa asennusikkunan. Paina **Install** (Asenna).
   - Jos tuplaklikkaus ei toimi: avaa Claude Desktopissa **Settings → Extensions** (Asetukset → Laajennukset) ja vedä ladattu tiedosto ikkunaan.
3. **Kokeile:** aloita uusi keskustelu ja kysy esimerkiksi _"Hae Orimattilan kastetuista Johan Hanssonin ja Ottilia Andersdotterin lapset."_ Claude saattaa kysyä luvan käyttää laajennusta; salli se.

### Jos jokin ei toimi

- **Laajennus ei näy tai Claude ei käytä sitä:** tarkista Settings → Extensions -näkymästä, että _HisKi – sukututkimushaut_ on päällä. Käynnistä Claude Desktop tarvittaessa uudelleen.
- **"Hiski ei vastannut" tai "yritä hetken kuluttua":** HisKi-palvelu voi olla hetkellisesti ruuhkainen. Yritä hetken päästä uudelleen.
- **Tuloksia ei löydy:** kokeile väljempää hakua, esimerkiksi pelkkää etunimeä ja isän nimeä tai laajempaa vuosiväliä. Katso myös vinkit alta.
- **Päivitys:** lataa uusin versio samasta linkistä ja asenna se samalla tavalla.

## Näin haet hyvin

- **Kirjoita nimet nykymuodossa.** Hiski löytää myös vanhat ja ruotsinkieliset muodot: _Johan_ löytää myös _Juho_, _Johannes_ ja _Johanss._
- **Patronyymit** (isännimet) toimivat päätteen kanssa tai ilman: _Johan_, _Johansson_ tai _Juhonpoika_.
- **Sukunimistä** riittää usein alku, noin viisi kirjainta. Länsi-Suomessa sukunimiä ei usein ollut, ja kirjoihin on voitu merkitä talon nimi.
- **Kylien nimet** ovat kirjoissa usein ruotsiksi tai vanhassa asussa (Niemi → _Njemis_). Claude voi katsoa seurakunnan kylät ja niiden vanhat nimet.
- **Rajaa vuosilla**, jos tiedät suunnilleen, milloin tapahtuma oli.
- **Pyydä tarkat tiedot** kiinnostavasta tapahtumasta. Silloin saat nimet eriteltyinä, alkuperäiset kommentit ja linkin SSHY:n digiarkistoon, jossa voi katsoa alkuperäisen kirkonkirjan kuvaa.

## Hyvä tietää

- **Aineiston rajat:** Hiskissä on tapahtumia 1600-luvulta monessa seurakunnassa 1900-luvun alkupuolelle, ja näkyvissä on vain yli 100 vuotta vanhoja tapahtumia. Kunkin seurakunnan vuodet vaihtelevat, ja Claude voi tarkistaa ne. Tyhjä tulos ei tarkoita, ettei tapahtumaa olisi ollut: se voi olla kirjassa, jota ei ole tallennettu, toisessa seurakunnassa tai eri kirjoitusasulla.
- **Tiedoissa voi olla virheitä.** Tarkista tärkeät tiedot alkuperäisestä kirkonkirjasta (digiarkiston linkki).
- **Luovutettu Karjala:** näiden seurakuntien kirjat on pääosin tallennettu [Karjala-tietokantaan](http://www.karjalatk.fi/), ei Hiskiin.
- **Hiskiä kunnioittaen:** haut tehdään omalta koneeltasi suoraan HisKi-palveluun, jota ylläpidetään vapaaehtoisvoimin. Vältä valtavia massahakuja.
- **Tietosuoja:** laajennus ei tallenna eikä lähetä tietoja minnekään muualle kuin HisKi-palveluun.

---

## Kehittäjille

### Käyttö muissa MCP-asiakkaissa

Palvelin on npm-paketti `hiski-mcp`, joka toimii stdion yli. Se vaatii Node.js:n (≥ 22).

**Claude Code:**

```bash
claude mcp add hiski -- npx -y hiski-mcp
```

**Codex CLI:**

```bash
codex mcp add hiski -- npx -y hiski-mcp
```

tai `~/.codex/config.toml`:

```toml
[mcp_servers.hiski]
command = "npx"
args = ["-y", "hiski-mcp"]
```

**Muut asiakkaat** (esim. Cursor, VS Code, Claude Desktop ilman laajennusta):

```json
{
  "mcpServers": {
    "hiski": { "command": "npx", "args": ["-y", "hiski-mcp"] }
  }
}
```

Työkaluja voi kokeilla käsin MCP Inspectorilla: `npx @modelcontextprotocol/inspector npx -y hiski-mcp`.

### Työkalut

| Työkalu              | Tehtävä                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| `etsi_seurakunta`    | Seurakunnat nimellä, ruotsinkielisellä nimellä tai koodilla, indeksoidut vuodet kirjoittain (ei verkkoa). |
| `seurakunnan_tiedot` | Kirjat ja vuodet, naapuriseurakunnat koodeineen, maakunta, historia, kylät ja vanhat nimet.               |
| `hae_kastetut`       | Kastettujen haku: lapsi, isä, äiti, kylä/talo, vuodet.                                                    |
| `hae_vihityt`        | Vihittyjen haku: mies ja vaimo asuinpaikkoineen.                                                          |
| `hae_haudatut`       | Haudattujen haku: vainaja, kuolinsyy, ikä, syntymäaika ja omainen.                                        |
| `hae_muuttaneet`     | Sisään- tai poismuuttaneiden haku.                                                                        |
| `hae_kaikki`         | Henkilön haku kaikista kirjoista kerralla.                                                                |
| `hae_tapahtuma`      | Yhden tapahtuman tarkat tiedot: eritellyt nimet, kommentit, digiarkiston linkki ja pysyvä linkki.         |

Kaikki työkalut ovat vain lukevia. Hakuvinkit ovat palvelimen `instructions`-kentässä (`src/ohjeet.ts`).

### Kehitys

```bash
npm ci
npm run check          # tyyppitarkistus, ESLint, Prettier ja testit
npm run build          # dist/ (npm-paketti)
npm run paketoi        # hiski-mcp.mcpb (Claude Desktop)
npm run testaa-paketti # purkaa paketin tyhjään kansioon ja kokeilee sitä
npm run test:live      # testit oikeaa Hiskiä vasten (myös ajastettuna CI:ssä)
```

- Parserit testataan Hiskistä tallennettuja sivuja vasten (`test/fixtures/`, luettelo `scripts/fixturet.ts`). Ne päivitetään komennolla `npm run tallenna-fixturet`.
- Seurakuntien nimet ja vuodet ovat tiedostossa `src/data/seurakunnat.json`. Ne päivitetään komennolla `npm run paivita-seurakunnat`, koska Hiskiin lisätään vuosia jatkuvasti.
- Hiskin erikoisuudet (latin-1-lomakkeet, satunnaiset virhesivut, otsikoton lohko ym.) ja rakenne on kuvattu tiedostossa [docs/toteutussuunnitelma.md](docs/toteutussuunnitelma.md). Julkaisuohje on tiedostossa [docs/julkaisu.md](docs/julkaisu.md).

Palaute ja virheilmoitukset: [GitHub Issues](https://github.com/jleh/hiski-mcp/issues).

## Lisenssi

[MIT](LICENSE)

---

**In English:** an unofficial [MCP](https://modelcontextprotocol.io) server for searching the [HisKi](https://hiski.genealogia.fi/hiski?fi) database of Finnish parish records (baptisms, marriages, burials and migrations). Install `hiski-mcp.mcpb` in Claude Desktop, or run `npx -y hiski-mcp` in any MCP client. Not affiliated with the Genealogical Society of Finland.
