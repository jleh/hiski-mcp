# Julkaisu

Julkaisu tapahtuu tagilla. `.github/workflows/julkaisu.yml` tarkistaa, että tagi, `package.json` ja `manifest.json` ovat samaa versiota. Sen jälkeen se ajaa tarkistukset ja testit, rakentaa `.mcpb`-paketin, julkaisee npm-paketin ja luo GitHub Releasen paketteineen.

## Tavallinen julkaisu

```bash
git switch main && git pull
npm version 0.2.0          # päivittää package.json:n ja manifest.json:n, tekee commitin ja tagin v0.2.0
git push origin main v0.2.0
```

Julkaisun etenemistä voi seurata GitHubin Actions-välilehdellä. Jos jokin askel epäonnistuu, ajon voi käynnistää uudelleen, koska jo julkaistu npm-versio ja olemassa oleva release ohitetaan. Valmis paketti on osoitteessa
`https://github.com/jleh/hiski-mcp/releases/latest/download/hiski-mcp.mcpb`.

Haaran `main` suojaus vaatii vihreän CI:n, joten version commit pushataan suoraan vain ylläpitäjänä. Toinen tapa on tehdä versionnosto PR:nä ja luoda tagi mergen jälkeen.

## Ensimmäinen julkaisu (kerran)

npm:n Trusted Publishingin voi määrittää vain olemassa olevalle paketille. Siksi ensimmäinen versio julkaistaan käsin:

1. Julkaise npm:ään omalla tunnuksella:
   ```bash
   npm whoami                 # jleh
   npm publish --access public
   ```
2. Määritä npmjs.com:ssa: **hiski-mcp → Settings → Trusted Publisher → GitHub Actions**
   - Organization or user: `jleh`
   - Repository: `hiski-mcp`
   - Workflow filename: `julkaisu.yml`
3. Pushaa tagi, jolloin GitHub Release ja `.mcpb` syntyvät:
   ```bash
   git tag v0.1.0 && git push origin v0.1.0
   ```
   Workflow huomaa, että versio on jo npm:ssä, ja ohittaa npm-julkaisun.

Tämän jälkeen npm-julkaisu toimii ilman tokeneita ja saa provenance-merkinnän.

## Paketin kokeilu ennen julkaisua

Jokaisen PR:n CI rakentaa `.mcpb`-paketin ja tallentaa sen artefaktiksi `hiski-mcp-mcpb`:

1. Avaa PR:n tai commitin CI-ajo GitHubin Actions-välilehdellä.
2. Lataa artefakti `hiski-mcp-mcpb` ja pura zip. Sisällä on `hiski-mcp.mcpb`.
3. Tuplaklikkaa tiedostoa tai vedä se Claude Desktopin asetusten Laajennukset-näkymään.

Paikallisesti saman saa komennoilla `npm run paketoi && npm run testaa-paketti`.

## Allekirjoitus

Pakettia ei allekirjoiteta (`mcpb sign`). Itse allekirjoitettu varmenne ei lisää luotettavuutta Claude Desktopissa. Allekirjoitus kannattaa lisätä, jos käyttöön tulee luotettu varmenne.
