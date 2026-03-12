# Main Service

## Hvad er dette?

Denne service holder styr på opgaver og notifikationer i systemet.

Kort sagt bruges den til at:

- oprette og vise opgaver
- ændre status på opgaver
- oprette og vise notifikationer
- markere notifikationer som læst
- sende automatiske beskeder, når noget vigtigt sker

Service-navnet i koden er `main-service`, men for en almindelig bruger er det bedst at tænke på den som et centralt lag for opgaver og beskeder.

## Hvad kan systemet?

### 1. Sundhedstjek

Servicen har et simpelt sundhedstjek.

Formålet er at kunne se, om systemet er startet og svarer, uden at man behøver teste en hel funktion. Det bruges typisk af drift, overvågning eller andre systemer, der vil vide, om servicen er tilgængelig.

### 2. Sikker adgang

De fleste funktioner kræver godkendelse.

Det betyder, at ikke hvem som helst kan hente opgaver eller notifikationer. Kun godkendte systemer eller godkendte kald gennem gatewayen får adgang. På den måde er data beskyttet, og systemet kan skelne mellem interne services og rigtige brugere.

### 3. Udstedelse af system-token

Servicen kan udstede et adgangstoken til andre interne systemer.

Det bruges, når en anden service skal tale sikkert med denne service uden at være en menneskelig bruger. Man kan se det som en intern nøgle, der giver midlertidig adgang til at bruge API'et.

## Opgaver

### 4. Vise opgaver

Servicen kan hente en liste over opgaver.

Listen kan afgrænses, så man for eksempel kun ser:

- opgaver for en bestemt sælger
- opgaver for en bestemt kunde
- opgaver knyttet til et bestemt tilbud
- opgaver med bestemte statusser

Det gør det lettere at vise de rigtige opgaver i andre dele af løsningen.

### 5. Oprette opgaver

Servicen kan oprette nye opgaver.

En opgave består i praksis af:

- en titel
- hvem der har ansvaret
- hvilken kunde den handler om
- hvilket tilbud den hører til
- en eventuel deadline
- en status

Det gør det muligt at registrere opfølgning og ansvar i salgsarbejdet.

### 6. Ændre status på opgaver

En eksisterende opgave kan få ny status.

Det bruges til at flytte opgaven gennem dens livscyklus, for eksempel fra afventende til i gang eller udført. Hvis en opgave ikke findes, får man en tydelig fejl tilbage.

## Notifikationer

### 7. Vise notifikationer

Servicen kan hente notifikationer for en bruger.

Notifikationerne kan også filtreres, så man kun ser beskeder om et bestemt tilbud eller en bestemt kunde. De kan sorteres, så de nyeste eller ældste vises først.

Det er især nyttigt til en notifikationsliste i brugerfladen.

### 8. Oprette notifikationer manuelt

Servicen kan oprette en notifikation direkte.

Det bruges, når et andet system vil lægge en besked ind til en bruger. Beskeden kan have:

- titel
- brødtekst
- link til relevant side
- ekstra oplysninger
- relation til kunde eller tilbud

Der findes også en ældre, mere simpel måde at oprette notifikationer på, så eksisterende integrationer stadig virker.

### 9. Markere notifikationer som læst

En notifikation kan markeres som læst.

Det gør det muligt at skelne mellem nye og allerede håndterede beskeder i brugerfladen.

## Automatiske baggrundsfunktioner

### 10. Automatisk besked om ændringer på tilbud

Servicen kan lytte efter hændelser fra en kø og automatisk oprette notifikationer om tilbud.

Det bruges for eksempel når:

- et tilbud er oprettet af en anden
- et tilbud er opdateret af en anden
- et tilbud er markeret til afsendelse
- en status på et tilbud er ændret
- et tilbud bliver flyttet fra en sælger til en anden

Brugeren får så en intern besked i systemet, så personen bliver opmærksom på ændringen.

Hvis denne eksterne kø-forbindelse ikke er sat op, bliver funktionen bare ikke startet. Resten af servicen virker stadig.

### 11. Automatisk besked om opgave-deadlines

Servicen har nu også en baggrundsfunktion, der holder øje med deadlines på opgaver.

Den gør følgende:

- tjekker med faste mellemrum, om der findes opgaver med deadline, som snart udløber
- ser kun på åbne opgaver, ikke afsluttede eller annullerede
- opretter en notifikation til den ansvarlige bruger
- undgår at sende den samme besked igen og igen for den samme opgave

Med standardopsætningen tjekker den hvert 5. minut og leder efter opgaver, der har deadline inden for de næste 24 timer.

Det betyder, at brugeren automatisk bliver advaret i god tid, uden at nogen manuelt skal overvåge opgaverne.

## Stabilitet og sporbarhed

### 12. Ens fejlbeskeder

Når noget går galt, svarer servicen i et fast format.

Det gør det lettere for andre systemer og brugerflader at vise forståelige fejl og reagere rigtigt.

### 13. Request-id på alle kald

Hver forespørgsel får et id.

Det bruges til at spore en konkret handling gennem logs og fejlbeskeder. Hvis en bruger melder en fejl, kan drift eller udviklere bruge dette id til at finde det præcise forløb.

### 14. Logning af hændelser

Servicen logger både almindelig drift og fejl.

Det gælder blandt andet:

- opstart og nedlukning
- fejl i API-kald
- behandling af notifikationer
- om automatiske notifikationer blev oprettet, sprunget over eller afvist

Det gør løsningen lettere at overvåge og fejlfinde.

### 15. Registrering af behandling af indgående notifikationer

Når servicen modtager en tilbudsrelateret hændelse, gemmer den også et spor af, hvordan hændelsen blev behandlet.

Det bruges til at kunne se:

- om en notifikation blev oprettet
- om den var en dublet
- om data var ugyldige
- om den blev forsøgt igen senere
- om modtageren ikke kunne findes

Det giver bedre kontrol i drift og support.

## Hvad servicen ikke gør

Det er vigtigt at forstå, hvad denne service ikke ser ud til at gøre:

- den sender ikke e-mails
- den sender ikke SMS'er
- den sender ikke push-notifikationer til mobil direkte

Notifikationerne er interne systembeskeder, som bliver gemt og kan vises i en brugerflade eller bruges af andre systemer.

## Kort opsummering

Hvis man skal forklare løsningen helt enkelt, så gør den dette:

- holder styr på opgaver
- holder styr på interne notifikationer
- beskytter adgangen til data
- hjælper andre interne systemer med sikker adgang
- lytter efter vigtige hændelser om tilbud
- advarer automatisk om opgaver med deadline

## Teknisk reference

Hvis man senere vil se de konkrete API-kald og felter, findes den tekniske oversigt i [api.md](./api.md).
