# Hiski MCP

Haluan käyttää tekoälyä apuna sukututkimuksessa. Suomalaisessa
sukututkimuksessa tietojen hakuun on olemassa Hiski-palvelu, josta
voidaan hakea luetteloita: kastetuista, vihityistä ja haudatuista
seurakunnittain.

Haku on vanhanaikainen lomakkeilla toimiva käyttöliittymä.
Jotta tekoälyagentti voisi sitä käyttää, tarvitsisi rakentaa
tähän hakemistoon projekti, jossa toteutetaan hiski-mcp.

## Seurakunnat

Eri surakuntien nimet ja koodit löytyvät seurakunnat.txt tiedostosta.
Se on kopioitu palvelun listauksesta. On mahdollista hakea useasta seurakunnasta yhtä aikaa.

## Hakulomake

### Kastettujen hakeminen

Tällä voidaan hakea kastettujen kirjasta tietoja.

Esimerkki lomakkeesta:

```html
<form name="lomake" method="POST" action="/hiski">
  <input name="komento" type="hidden" value="haku" />
  <input name="srk" type="hidden" value="0366" />
  <input name="kirja" type="hidden" value="kastetut" />
  <input type="hidden" name="kieli" value="fi" />
  <center>
    <table border="5" bgcolor="#f5f5f5" cellspacing="0" cellpadding="2">
      <tr>
        <th colspan="6">
          <big>Orimattila - kastetut</big> (1697-1710, 1718-1890)
        </th>
      </tr>
      <tr>
        <th>Lapsi</th>
        <td>etunimi</td>
        <td><input name="etunimi" maxlength="30" value="" tabindex="1" /></td>
        <th colspan="2">Vuodet</th>
        <td align="CENTER">
          <input
            name="alkuvuosi"
            tabindex="2"
            size="10"
            maxlength="10"
            value=""
            onChange="if (!checkVuosi(this.value)) {this.focus();this.select();}"
          />&nbsp;-&nbsp;<input
            name="loppuvuosi"
            tabindex="3"
            size="10"
            maxlength="10"
            value=""
            onChange="if (!checkVuosi(this.value)) {this.focus();this.select();}"
          />
        </td>
      </tr>
      <tr>
        <th>Paikka</th>
        <td>kylä/talo</td>
        <td><input name="ikyla" maxlength="30" value="" tabindex="4" /></td>
        <td colspan="3" align="CENTER" valign="MIDDLE" rowspan="1">
          Tulosta enintään
          <select tabindex="5" name="maxkpl">
            <option>15</option>
            <option>30</option>
            <option selected>50</option>
            <option>100</option>
            <option>250</option>
            <option>500</option>
            <option>1000</option>
          </select>
          tapahtumaa.
        </td>
      </tr>
      <tr>
        <th width="10%" rowspan="4">Isä</th>
        <td width="13%">etunimi</td>
        <td width="27%">
          <input name="ietunimi" maxlength="30" value="" tabindex="6" />
        </td>
        <th width="10%" rowspan="4">Äiti</th>
        <td width="13%">etunimi</td>
        <td width="27%">
          <input name="aetunimi" maxlength="30" value="" tabindex="10" />
        </td>
      </tr>
      <tr>
        <td>patronyymi</td>
        <td>
          <input name="ipatronyymi" maxlength="30" value="" tabindex="7" />
        </td>
        <td>patronyymi</td>
        <td>
          <input name="apatronyymi" maxlength="30" value="" tabindex="11" />
        </td>
      </tr>
      <tr>
        <td>sukunimi</td>
        <td><input name="isukunimi" maxlength="30" value="" tabindex="8" /></td>
        <td>sukunimi</td>
        <td>
          <input name="asukunimi" maxlength="30" value="" tabindex="12" />
        </td>
      </tr>
      <tr>
        <td>ammatti</td>
        <td><input name="iammatti" maxlength="30" value="" tabindex="9" /></td>
        <td>ammatti</td>
        <td><input name="aammatti" maxlength="30" value="" tabindex="13" /></td>
      </tr>
      <tr valign="MIDDLE">
        <td align="CENTER" colspan="2"><input type="SUBMIT" value="Hae" /></td>
        <td align="CENTER">
          <input
            type="RESET"
            value="Tyhjennä"
            onClick="document.location.href='/hiski?fi+0366+kastetut';"
          />
        </td>
        <td align="CENTER" colspan="4">
          <a target="_new" href="/historia/fi/ohjeet.htm"
            >Ohjeita ja esimerkkejä</a
          >
          | <a href="/hiski?fi+0366+kastetut2">Laajennettu haku</a> |
          <a href="/hiski?fi+0366+kastetut+0">Selaus</a>
        </td>
      </tr>
    </table>
  </center>
</form>
```

Tässä esimerkki miten hain tietoa lomakkeella curlilla:

```bash
curl 'https://hiski.genealogia.fi/hiski' \
  --compressed \
  -X POST \
  -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' \
  -H 'Accept-Language: en-US,en;q=0.9' \
  -H 'Accept-Encoding: gzip, deflate, br, zstd' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Connection: keep-alive' \
  --data-raw 'komento=haku&srk=0366&kirja=kastetut&kieli=fi&etunimi=&alkuvuosi=&loppuvuosi=&ikyla=&maxkpl=50&ietunimi=Johan&aetunimi=Ottilia&ipatronyymi=Hansson&apatronyymi=Andersdotter&isukunimi=&asukunimi=&iammatti=&aammatti='
```

Ja vastaus:

```html
<HTML>
<HEAD>
<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">
<TITLE>Haku - Orimattila - kastetut</TITLE>
<META NAME="ROBOTS" CONTENT="NOINDEX, NOFOLLOW">
</HEAD>
<BODY bgcolor="#ffffff" text="#000000" link="#0000FF" alink="#FF0000" vlink="#660099">
<table cellspacing=1 cellpadding=1 width="100%"><tr valign=middle>
<td><A HREF="/historia/"><IMG SRC="/historia/sttlogoj.gif" WIDTH=50 HEIGHT=50 BORDER=0 ALT="logo"></A><BR></TD>
<td>&nbsp;</td>
<TD><BIG><B>Suomen&nbsp;Sukututkimusseura</B></BIG><BR>
Historiakirjat<BR></TD>
<td>&nbsp;</td>
<TD WIDTH="100%" align=right>
[<A HREF="/hiski?fi">Seurakuntaluettelo</A>] [<A HREF="/hiski?fi+0366">Kirjaluettelo</A>] [<A HREF="/hiski?fi+0366+kastetut">Hakulomake</A>]</TD></TR></TABLE><BR><BR><FONT SIZE="+2"><B>Orimattila - kastetut</B></FONT><BR>
<SMALL><UL>
<LI>Isän etunimi: JOHAN => Johan, Johannes, Johanss.
<LI>Isän patronyymi: HANS => Hans, Hansintytär, Hansinp., Hansentytär, Hansenp., Hansdott.
<LI>Äidin etunimi: OTTILIA => Otilia
<LI>Äidin patronyymi: ANDERS => Anders, Andersdot., Andersd:dr, Andersgr., Andersdotters, Anders Wilh.ss.
</UL></SMALL>
<TABLE BORDER=1 CELLSPACING=0>
<TR><TH>Syntynyt <TH>Kastettu <TH>Kylä <TH>Talo <TH>Isä <TH>Äiti <TH>Lapsi<BR>
<TR><TD><a href="/hiski?fi+0366+kastetut+18795"><img src="/historia/sl.gif" border=0 alt="*"></a>21.9.1834 <TD>22.9.1834 <TD>Njemis <TD>Bärnilä <TD>B. Johan Hansson &nbsp; <TD> Otteliana Andersdotter &nbsp;  <TD>Maria Sofia<BR>


<TR><TD><a href="/hiski?fi+0366+kastetut+19424"><img src="/historia/sl.gif" border=0 alt="*"></a>16.11.1837 <TD>17.11.1837 <TD>Njemis <TD>Bärnilä <TD>B. Johan Hansson &nbsp; <TD> Otteliana Andersdotter &nbsp;  <TD>Hedda Mina<BR>


<TR><TD><a href="/hiski?fi+0366+kastetut+19856"><img src="/historia/sl.gif" border=0 alt="*"></a>24.9.1839 <TD>29.9.1839 <TD>Niemis <TD>Bärnilä <TD>Bonden Johan Hansson &nbsp; <TD> Otteliana Andersdotter &nbsp; 22 <TD>Johan Claës<BR>


<TR><TD><a href="/hiski?fi+0366+kastetut+20565"><img src="/historia/sl.gif" border=0 alt="*"></a>20.10.1842 <TD>6.11.1842 <TD>Niemis <TD>Bärnilä <TD>Bonden Johan Hansson &nbsp; <TD> Otteliana Anders:dtr &nbsp; 26 <TD>Johan Claes<BR>


<TR><TD><a href="/hiski?fi+0366+kastetut+21108"><img src="/historia/sl.gif" border=0 alt="*"></a>24.2.1845 <TD>1.3.1845 <TD>Niemis <TD>Bärnilä <TD>Bonden Johan Hansson &nbsp; <TD> Otteliana Anders:dr &nbsp; 29 <TD>Wilhelm<BR>


<TR><TD><a href="/hiski?fi+0366+kastetut+21689"><img src="/historia/sl.gif" border=0 alt="*"></a>2.9.1847 <TD>9.9.1847 <TD>Niemis <TD>Bärnilä <TD>B:den Johan Hansson &nbsp; <TD> Otteliana Anders:dr &nbsp; 30 <TD>Joachim<BR>


<TR><TD><a href="/hiski?fi+0366+kastetut+22185"><img src="/historia/sl.gif" border=0 alt="*"></a>12.9.1849 <TD>15.9.1849 <TD>?Mallux <TD>Bertola <TD>B:den Johan Hansson &nbsp; <TD> Otteliana And:dr. &nbsp; 30 <TD>Maria Charlotta<BR>


<TR><TD><a href="/hiski?fi+0366+kastetut+22691"><img src="/historia/sl.gif" border=0 alt="*"></a>19.9.1851 <TD>23.9.1851 <TD>Niemis <TD>Bernilä <TD>Sytn. Joh. Hansson &nbsp; <TD> Otteliana And:dr. &nbsp; 34 <TD>Otto<BR>


<TR><TD><a href="/hiski?fi+0366+kastetut+23504"><img src="/historia/sl.gif" border=0 alt="*"></a>19.9.1854 <TD>20.9.1854 <TD>Niemis <TD>Bernilä <TD>Sytn. Joh. Hansson &nbsp; <TD> Otteliana And:dr. &nbsp; 38 <TD>Mathilda<BR>


</TABLE>
<P>9 tapahtumaa löytyi.<P>
<FORM METHOD=POST ACTION="/hiski">
<input name=srk type=hidden value="0366">
<INPUT NAME="kirja" TYPE=hidden VALUE="kastetut">
<INPUT NAME="kieli" TYPE=hidden VALUE="fi">
<INPUT NAME="ietunimi" TYPE=hidden VALUE="Johan">
<INPUT NAME="ipatronyymi" TYPE=hidden VALUE="Hansson">
<INPUT NAME="aetunimi" TYPE=hidden VALUE="Ottilia">
<INPUT NAME="apatronyymi" TYPE=hidden VALUE="Andersdotter">
<INPUT TYPE=SUBMIT VALUE="Hakulomakkeeseen">
</FORM>
<P><HR><TABLE BORDER=0>
<TR><TD><FONT SIZE="-1">Suomen Sukututkimusseura<BR>
Liisankatu 16 A<BR>00170 Helsinki</FONT><BR></TD>
<TD>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</TD>
<TD><FONT SIZE="-1">Puhelin: (09) 278 1188 /
Faksi: (09) 278 1199<BR>
Sähköposti: <A HREF="/cdn-cgi/l/email-protection#deadbbabacbf9eb9bbb0bbbfb2b1b9b7bff0b8b7"><span class="__cf_email__" data-cfemail="85f6e0f0f7e4c5e2e0ebe0e4e9eae2ece4abe3ec">[email&#160;protected]</span></A><BR>
WWW: <A HREF="http://www.genealogia.fi/">http://www.genealogia.fi/</A></FONT></TD>
</TR></TABLE><script data-cfasync="false" src="/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js"></script></BODY></HTML>
```

Tässä siis halusin hakea listauksen Orimattilassa asuneiden
Johan Hanssonin ja Ottilia Andersdotterin lapsista. Olisin myös voinut
antaa vuodet rajaamaan hakua, mutta näillä nimillä ei löytynyt muita tuloksia.

### Vihityt

Vihityt haku toimii samaan tapaan.

```html
<form name="lomake" method="POST" action="/hiski">
  <input name="komento" type="hidden" value="haku" />
  <input name="srk" type="hidden" value="0366" />
  <input name="kirja" type="hidden" value="vihityt" />
  <input type="hidden" name="kieli" value="fi" />
  <center>
    <table border="5" bgcolor="#f5f5f5" cellspacing="0" cellpadding="2">
      <tr>
        <th colspan="6">
          <big>Orimattila - vihityt</big> (1697-1710, 1718-1741, 1744-1805,
          1807-1880)
        </th>
      </tr>
      <tr>
        <th colspan="2">Vuodet</th>
        <td align="CENTER">
          <input
            name="alkuvuosi"
            tabindex="2"
            size="10"
            maxlength="10"
            value=""
            onChange="if (!checkVuosi(this.value)) {this.focus();this.select();}"
          />&nbsp;-&nbsp;<input
            name="loppuvuosi"
            tabindex="3"
            size="10"
            maxlength="10"
            value=""
            onChange="if (!checkVuosi(this.value)) {this.focus();this.select();}"
          />
        </td>
        <td colspan="3" align="CENTER" valign="MIDDLE" rowspan="1">
          Tulosta enintään
          <select tabindex="5" name="maxkpl">
            <option>15</option>
            <option>30</option>
            <option selected>50</option>
            <option>100</option>
            <option>250</option>
            <option>500</option>
            <option>1000</option>
          </select>
          tapahtumaa.
        </td>
      </tr>
      <tr>
        <th width="10%" rowspan="5">Mies</th>
        <td width="13%">etunimi</td>
        <td width="27%">
          <input name="ietunimi" maxlength="30" value="" tabindex="6" />
        </td>
        <th width="10%" rowspan="5">Vaimo</th>
        <td width="13%">etunimi</td>
        <td width="27%">
          <input name="aetunimi" maxlength="30" value="" tabindex="11" />
        </td>
      </tr>
      <tr>
        <td>patronyymi</td>
        <td>
          <input name="ipatronyymi" maxlength="30" value="" tabindex="7" />
        </td>
        <td>patronyymi</td>
        <td>
          <input name="apatronyymi" maxlength="30" value="" tabindex="12" />
        </td>
      </tr>
      <tr>
        <td>sukunimi</td>
        <td><input name="isukunimi" maxlength="30" value="" tabindex="8" /></td>
        <td>sukunimi</td>
        <td>
          <input name="asukunimi" maxlength="30" value="" tabindex="13" />
        </td>
      </tr>
      <tr>
        <td>ammatti</td>
        <td><input name="iammatti" maxlength="30" value="" tabindex="9" /></td>
        <td>ammatti</td>
        <td><input name="aammatti" maxlength="30" value="" tabindex="14" /></td>
      </tr>
      <tr>
        <td>paikka</td>
        <td><input name="ikyla" maxlength="30" value="" tabindex="10" /></td>
        <td>paikka</td>
        <td><input name="akyla" maxlength="30" value="" tabindex="15" /></td>
      </tr>
      <tr valign="MIDDLE">
        <td align="CENTER" colspan="2"><input type="SUBMIT" value="Hae" /></td>
        <td align="CENTER">
          <input
            type="RESET"
            value="Tyhjennä"
            onClick="document.location.href='/hiski?fi+0366+vihityt';"
          />
        </td>
        <td align="CENTER" colspan="4">
          <a target="_new" href="/historia/fi/ohjeet.htm"
            >Ohjeita ja esimerkkejä</a
          >
          | <a href="/hiski?fi+0366+vihityt2">Laajennettu haku</a> |
          <a href="/hiski?fi+0366+vihityt+0">Selaus</a>
        </td>
      </tr>
    </table>
  </center>
</form>
```

### Haudatut

```html
<form name="lomake" method="POST" action="/hiski">
  <input name="komento" type="hidden" value="haku" />
  <input name="srk" type="hidden" value="0366" />
  <input name="kirja" type="hidden" value="haudatut" />
  <input type="hidden" name="kieli" value="fi" />
  <center>
    <table border="5" bgcolor="#f5f5f5" cellspacing="0" cellpadding="2">
      <tr>
        <th colspan="6">
          <big>Orimattila - haudatut</big> (1697-1710, 1718-1740, 1742-1880)
        </th>
      </tr>
      <tr>
        <th colspan="2">Vuodet</th>
        <td align="CENTER">
          <input
            name="alkuvuosi"
            tabindex="2"
            size="10"
            maxlength="10"
            value=""
            onChange="if (!checkVuosi(this.value)) {this.focus();this.select();}"
          />&nbsp;-&nbsp;<input
            name="loppuvuosi"
            tabindex="3"
            size="10"
            maxlength="10"
            value=""
            onChange="if (!checkVuosi(this.value)) {this.focus();this.select();}"
          />
        </td>
        <td colspan="3" align="CENTER" valign="MIDDLE" rowspan="1">
          Tulosta enintään
          <select tabindex="5" name="maxkpl">
            <option>15</option>
            <option>30</option>
            <option selected>50</option>
            <option>100</option>
            <option>250</option>
            <option>500</option>
            <option>1000</option>
          </select>
          tapahtumaa.
        </td>
      </tr>
      <tr>
        <th width="10%" rowspan="8">Henkilö</th>
        <td width="13%">etunimi</td>
        <td width="27%">
          <input name="ietunimi" maxlength="30" value="" tabindex="6" />
        </td>
        <th width="10%" rowspan="5">Omainen</th>
        <td width="13%">etunimi</td>
        <td width="27%">
          <input name="aetunimi" maxlength="30" value="" tabindex="15" />
        </td>
      </tr>
      <tr>
        <td>patronyymi</td>
        <td>
          <input name="ipatronyymi" maxlength="30" value="" tabindex="7" />
        </td>
        <td>patronyymi</td>
        <td>
          <input name="apatronyymi" maxlength="30" value="" tabindex="16" />
        </td>
      </tr>
      <tr>
        <td>sukunimi</td>
        <td><input name="isukunimi" maxlength="30" value="" tabindex="8" /></td>
        <td>sukunimi</td>
        <td>
          <input name="asukunimi" maxlength="30" value="" tabindex="17" />
        </td>
      </tr>
      <tr>
        <td>ammatti</td>
        <td><input name="iammatti" maxlength="30" value="" tabindex="9" /></td>
        <td>ammatti</td>
        <td><input name="aammatti" maxlength="30" value="" tabindex="18" /></td>
      </tr>
      <tr>
        <td>paikka</td>
        <td><input name="ikyla" maxlength="30" value="" tabindex="10" /></td>
        <td>sukulaissuhde</td>
        <td>
          <select name="ssuhde" tabindex="19">
            <option value="ei väliä" selected>ei väliä</option>
            <option value="isä">isä</option>
            <option value="äiti">äiti</option>
            <option value="puoliso">puoliso</option>
            <option value="muu">muu</option>
          </select>
        </td>
      </tr>
      <tr>
        <td>kuolinsyy</td>
        <td><input name="ksyy" maxlength="30" value="" tabindex="11" /></td>
      </tr>
      <tr>
        <td>syntymäpäivä</td>
        <td>
          <input
            name="syntalku"
            size="10"
            maxlength="10"
            tabindex="12"
            value=""
            onChange="if (!checkVuosi(this.value)) {this.focus();this.select();}"
          />
          -
          <input
            name="syntloppu"
            size="10"
            maxlength="10"
            tabindex="13"
            value=""
            onChange="if (!checkVuosi(this.value)) {this.focus();this.select();}"
          />
          <tr>
            <td>ikä</td>
            <td><input name="ika" maxlength="30" value="" tabindex="14" /></td>
          </tr>
          <tr valign="MIDDLE">
            <td align="CENTER" colspan="2">
              <input type="SUBMIT" value="Hae" />
            </td>
            <td align="CENTER">
              <input
                type="RESET"
                value="Tyhjennä"
                onClick="document.location.href='/hiski?fi+0366+haudatut';"
              />
            </td>
            <td align="CENTER" colspan="4">
              <a target="_new" href="/historia/fi/ohjeet.htm"
                >Ohjeita ja esimerkkejä</a
              >
              | <a href="/hiski?fi+0366+haudatut2">Laajennettu haku</a> |
              <a href="/hiski?fi+0366+haudatut+0">Selaus</a>
            </td>
          </tr>
        </td>
      </tr>
    </table>
  </center>
</form>
```

## Muuta

Palvelussa on myös lomakkeille laajennettu haku -versio ja kaikkien tietojen haku,
mutta luulen, että näillä kolmella haulla pärjää hyvin.
