# Tietosuoja / Privacy Policy

_Voimassa 27.9.2026 alkaen. Effective 27 September 2026._

[In English below.](#privacy-policy)

## Tietosuojaseloste

Tämä seloste koskee hiski-mcp-laajennusta (Claude Desktopin `.mcpb`-paketti ja npm-paketti `hiski-mcp`). Laajennus on harrastajan tekemä avoimen lähdekoodin työkalu. Se ei ole Suomen Sukututkimusseuran tekemä tai ylläpitämä.

### Kerättävät tiedot

Laajennus ei kerää tietoja kehittäjälle. Siinä ei ole analytiikkaa, telemetriaa, virheraportointia eikä lokitiedostoja, eikä se lähetä mitään kehittäjän palvelimille.

### Käyttö ja tallennus

Laajennus toimii omalla koneellasi. Kun Claude tekee haun, laajennus lähettää hakuehdot (esimerkiksi nimet, seurakunnat, paikat ja vuodet) suoraan HisKi-palveluun osoitteeseen `https://hiski.genealogia.fi` ja palauttaa vastauksen Claudelle. Pyynnöissä näkyvät koneesi IP-osoite ja tunniste `hiski-mcp/<versio> (+https://github.com/jleh/hiski-mcp)`.

Seurakuntien nimet ja vuodet ovat laajennuksen mukana, joten seurakunnan etsiminen (`etsi_seurakunta`) ei lähetä mitään verkkoon. Laajennus ei lue tiedostojasi, keskusteluhistoriaasi eikä Clauden muistia, eikä se tallenna mitään levylle.

### Tietojen luovutus kolmansille osapuolille

- **Suomen Sukututkimusseura** ylläpitää HisKi-palvelua ([hiski.genealogia.fi](https://hiski.genealogia.fi/hiski?fi)) ja vastaanottaa hakupyynnöt. Seuran palvelua suojaa Cloudflare. Ne käsittelevät pyyntöjä omien käytäntöjensä mukaan.
- **Claude-sovellus** (tai muu käyttämäsi MCP-asiakas) näkee hakuehdot ja tulokset osana keskustelua, ja niitä koskevat sovelluksen omat ehdot, esimerkiksi Anthropicin tietosuojakäytäntö.
- Asennuksessa paketin ladannut palvelu (GitHub tai npm) näkee latauksen.

Muille tietoja ei luovuteta.

### Säilytysaika

Laajennus ei säilytä tietoja. Hakuehdot ja tulokset ovat muistissa vain haun ajan.

### Yhteystiedot

Kysymykset ja palaute: [GitHub Issues](https://github.com/jleh/hiski-mcp/issues). Ylläpitäjä: Juuso Lehtinen ([github.com/jleh](https://github.com/jleh)).

Jos seloste muuttuu, muutokset näkyvät tämän tiedoston versiohistoriassa GitHubissa.

## Privacy Policy

This policy covers the hiski-mcp extension (the `.mcpb` package for Claude Desktop and the npm package `hiski-mcp`). It is an unofficial open-source tool made by a hobbyist and is not made or maintained by the Genealogical Society of Finland (Suomen Sukututkimusseura).

### Data collection

The extension collects no data for its developer. It has no analytics, telemetry, error reporting or log files, and it sends nothing to the developer's servers.

### Usage and storage

The extension runs on your own computer. When Claude runs a search, the extension sends the search terms (such as names, parishes, places and years) directly to the HisKi service at `https://hiski.genealogia.fi` and returns the answer to Claude. The requests carry your computer's IP address and the identifier `hiski-mcp/<version> (+https://github.com/jleh/hiski-mcp)`.

Parish names and years are bundled with the extension, so finding a parish (`etsi_seurakunta`) sends nothing over the network. The extension does not read your files, conversation history or Claude's memory, and it stores nothing on disk.

### Third-party sharing

- **The Genealogical Society of Finland** runs the HisKi service ([hiski.genealogia.fi](https://hiski.genealogia.fi/hiski?fi)) and receives the search requests. The service is protected by Cloudflare. They handle the requests under their own practices.
- **The Claude app** (or any other MCP client you use) sees the search terms and results as part of the conversation, under that app's own terms, such as Anthropic's privacy policy.
- When you install the extension, the service you download it from (GitHub or npm) sees the download.

No data is shared with anyone else.

### Data retention

The extension retains no data. Search terms and results are held in memory only while a search runs.

### Contact

Questions and feedback: [GitHub Issues](https://github.com/jleh/hiski-mcp/issues). Maintainer: Juuso Lehtinen ([github.com/jleh](https://github.com/jleh)).

Changes to this policy are visible in this file's version history on GitHub.
