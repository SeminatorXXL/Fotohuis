-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Gegenereerd op: 04 mrt 2026 om 22:32
-- Serverversie: 10.4.32-MariaDB
-- PHP-versie: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `fotohuis`
--

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `categories`
--

CREATE TABLE `categories` (
  `id` int(10) UNSIGNED NOT NULL,
  `alias` text NOT NULL,
  `name` varchar(255) NOT NULL,
  `google_title` varchar(255) DEFAULT NULL,
  `meta_description` text DEFAULT NULL,
  `cover` varchar(255) NOT NULL,
  `banner` varchar(255) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `text` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Gegevens worden geëxporteerd voor tabel `categories`
--

INSERT INTO `categories` (`id`, `alias`, `name`, `google_title`, `meta_description`, `cover`, `banner`, `title`, `text`, `created_at`, `updated_at`) VALUES
(1, 'studio-opname', 'Studio-opname', 'Studio-opname in Venray en omgeving?', NULL, '/media/bedrijfsfotografie/focus-banner.jpg', '/media/bedrijfsfotografie/flag-banner.jpg', '', '<p><strong>Een studio-opname of buiten shoot</strong><br />Wij maken uitsluitend op afspraak een studio-opname. We hebben een zeer ruime, moderne studio van 70m2. Hierdoor zijn groepsfoto’s tot 12 personen voor ons geen probleem! Alles is bespreekbaar en kan aangepast worden aan uw stijl. Een voorbeeld meenemen mag natuurlijk altijd!</p><p><strong>Foto’s gaan online</strong><br />Na de shoot krijgt u een code waar u binnen 7 werkdagen alle foto’s kunt bekijken en bestellen, dit is een bestelmodule die voor ons is ontwikkeld. Na 60 dagen verloopt deze code en na 4 maanden worden de niet bestelde foto’s verwijdert. Bestelde foto’s worden automatisch geback-upt.</p><p><strong>Kosten van een studio/buiten-opname</strong></p><p><strong>Pakket 1</strong> Dit is een korte shoot van 10 min. voor max. 2personen.<br />We zorgen dat de studio klaar staat zodat we snel aan de slag kunnen. Foto’s bekijken we samen, deze gaan dus niet online. Kosten van de shoot zijn € 69,- .* Alle HR bestanden max. 8 op usb meerprijs  €79,-<br /><br /><strong>Pakket 2</strong> Dit is de meest gevraagde shoot van 30-40 min en is voor 1 tot 6 personen. We maken groepsfoto’s maar ook een mooi portret van elk persoon, Na de shoot worden de foto’s door ons geselecteerd en ontvangt u een code waarmee u zelf thuis, op uw gemak, de foto’s kunt bekijken en evt. bestellen. Heeft u vragen of bepaalde wensen dan kijken we samen of we hier aan kunnen voldoen. De kosten van deze shoot zijn € 99,- .* Alle HR bestanden max. 30 op usb meerprijs € 149,-<br /><br /><strong>Pakket 3</strong> Dit is een shoot van 40-60 min en is voor 1 tot 12 personen. We maken groepsfoto’s en onderling andere samenstellingen, maar ook een mooi portret van elk persoon. Na de shoot worden de foto’s door ons geselecteerd en ontvangt u een code waar u zelf thuis, op uw gemak, de foto’s kunt bekijken en evt bestellen. Heeft u vragen of bepaalde wensen dan kijken we samen of we hier aan kunnen voldoen. De kosten van deze shoot zijn € 145,-. * Alle HR bestanden max. 40 op usb meerprijs €149,-</p><p><strong>Digitaal afleveren van de bestanden</strong></p><p>LR 1000×1500 pixels € 9,95 per bestand max 13x18cm foto<br />MR 2000×3000 pixels  € 19,95 per bestand max 20x30cm foto<br />HR 4000×6000 pixels  € 49,- per bestand max 100x150cm foto <strong>bewerkt bestand</strong>.<strong>*</strong><br /><strong>(Alle bestanden zie meerprijs bij  pakket 1of pakket 2) </strong></p><p><strong>*</strong> Kiest u voor alle bestanden geef dit dan voor de shoot aan, <i>we leveren deze bestanden altijd in kleur en in zwart-wit op onze eigen USB.</i></p><p>* Het is niet mogelijk om alleen digitaal enkel bestand af te nemen, alleen in combinatie met afdrukken, wel kunt u kiezen voor een usb pakket dan ontvangt u alles in HR bestanden in kleur en in zwart-wit.</p><p>Ook kunt u ook bij ons terecht voor bijzondere vergrotingen op veel verschillende materialen zoals aluminium, canvas, hout, glas, leer, etc. Het maximale formaat op aluminium is 140×290 cm! Dit soort formaten maken wij bij regelmaat en zijn uniek in zowel deze regio als in heel Nederland.</p><p>Ook het juiste advies bij het uitzoeken van de mooiste foto aan de muur is bij ons dagelijks aan de orde. En ja, en zelfs een bezoekje bij u thuis behoort tot onze mogelijkheden en is zelfs vrij standaard.</p><p>Elk jaar maken wij tussen de 150 en 200 shoots per jaar, velen gingen u dus voor!<br />Hieronder ziet u een kleine selectie van opnames uit onze studio.</p>', '2026-02-06 22:48:57', '2026-03-04 21:11:59'),
(2, 'gezin-generatie-shoot', 'Gezin-Generatie Shoot', 'Gezin-Generatie Shoot in Venray en omging?', NULL, '/media/bedrijfsfotografie/fraw-banner.jpg', '/media/bedrijfsfotografie/thyron-banner.jpg', '', '<p>Hoe mooi en gaaf zijn deze gezin-generatie portretten! Denk aan 4 generatie’s naast elkaar, broertjes &amp; zusjes of zelfs nichtjes en neefjes (gaan opa en oma heel blij van worden!). Ook deze collage is een lust voor het oog en een waar kunstwerk aan de muur. We maken de opname tot maximaal 10 personen per collage. We maken dan van elk persoon een losse foto en in Photoshop maak ik hier een prachtig totaal plaatje van. Deze shoot kost €99,- en extra kosten per per persoon zijn €20,- (resultaat foto ontvankt u ook digitaal).</p>', '2026-02-06 22:50:17', '2026-03-04 19:57:20'),
(3, 'trouwfotografie', 'Trouwfotografie', NULL, NULL, '/media/bedrijfsfotografie/focus-banner2.jpg', '/media/bedrijfsfotografie/fraw-banner.jpg', '', '<p><strong>Uw trouwdag is één van de mooiste dagen van uw leven.</strong> Dit vraagt om prachtige foto’s. De bijna 500 bruidsparen zijn u al voor gegaan. FotoHuisVenray zorgt voor een herinnering om nooit meer te vergeten. Ook drone beelden zijn bij ons bijna standaad is zo gaaf om een aantal shots van boven te nemen!! Binnen 14 dagen krijgt u alle foto’s te zien via onze website. Dan gaan we aan de slag met het evt. vullen van een album met foto’s die door u worden gekozen zo krijg je een maatwerk album wat bij jullie past. Albums die wij maken komen van www.koylab.com , maar ook kleine albums met usb zijn bij ons verkrijgbaar. Of kiest u voor het digitale pakket, we verzorgen zelfs een leuke film zodat u nog eens extra kunt nagenieten van de mooiste dag van jullie leven. Voor meer informatie over een trouwreportage (de kosten en de mogelijkheden) raden wij aan om een afspraak te maken. We werken een maatwerk offerte uit voor jullie foto’s albums en film, na een persoonlijk gesprek. Onze albums die wij leveren zijn de albums van koylab, deze kunt u terug vinden op www.koylab.com dit zijn handgebonden albums voor een leven lang plezier!! Uurtarief: het maken van een trouwreportage heeft een uurtarief van €85,- ex BTW per uur, dit bedrag is incl. alle selectie bestanden op een mooie USB van FotoHuis.</p>', '2026-02-06 22:51:47', '2026-03-04 19:57:43'),
(4, 'bedrijfsfotografie', 'Bedrijfsfotografie', 'Fotografie voor uw bedrijf', 'Fotografie voor uw bedrijf', '/media/bedrijfsfotografie/flag-banner.jpg', '/media/bedrijfsfotografie/focus-banner2.jpg', '', '<p>Hoe mooi en gaaf zijn deze gezin-generatie portretten! Denk aan 4 generatie’s naast elkaar, broertjes &amp; zusjes of zelfs nichtjes en neefjes (gaan opa en oma heel blij van worden!). Ook deze collage is een lust voor het oog en een waar kunstwerk aan de muur. We maken de opname tot maximaal 10 personen per collage. We maken dan van elk persoon een losse foto en in Photoshop maak ik hier een prachtig totaal plaatje van. Deze shoot kost €99,- en extra kosten per per persoon zijn €20,- (resultaat foto ontvankt u ook digitaal).</p>', '2026-02-06 22:52:18', '2026-03-04 21:28:39'),
(5, 'uitvaart', 'Uitvaart', NULL, NULL, '/media/bedrijfsfotografie/thyron-banner.jpg', '/media/bedrijfsfotografie/focus-banner.jpg', '', '<p>Hoe mooi en gaaf zijn deze gezin-generatie portretten! Denk aan 4 generatie’s naast elkaar, broertjes &amp; zusjes of zelfs nichtjes en neefjes (gaan opa en oma heel blij van worden!). Ook deze collage is een lust voor het oog en een waar kunstwerk aan de muur. We maken de opname tot maximaal 10 personen per collage. We maken dan van elk persoon een losse foto en in Photoshop maak ik hier een prachtig totaal plaatje van. Deze shoot kost €99,- en extra kosten per per persoon zijn €20,- (resultaat foto ontvankt u ook digitaal).</p>', '2026-02-06 22:52:30', '2026-03-04 21:28:42');

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `company_info`
--

CREATE TABLE `company_info` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `logo` varchar(255) NOT NULL,
  `favicon` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `mobile` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `coc` varchar(255) NOT NULL,
  `instagram` varchar(255) NOT NULL,
  `facebook` varchar(255) NOT NULL,
  `linkedin` varchar(255) NOT NULL,
  `tiktok` varchar(255) NOT NULL,
  `gtm_head` text NOT NULL,
  `gtm_body` text NOT NULL,
  `cookie` text NOT NULL,
  `recaptcha_public_key` varchar(255) NOT NULL,
  `recaptcha_private_key` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Gegevens worden geëxporteerd voor tabel `company_info`
--

INSERT INTO `company_info` (`id`, `name`, `logo`, `favicon`, `email`, `mobile`, `phone`, `coc`, `instagram`, `facebook`, `linkedin`, `tiktok`, `gtm_head`, `gtm_body`, `cookie`, `recaptcha_public_key`, `recaptcha_private_key`) VALUES
(1, 'Fotohuis Venray', 'fotohuisvenray-wit.png', '/images/fav/favicon-1772652173821.ico', 'info@fotohuisvenray.nl', '06-35644440', '0478 58 09 74', '', '', 'https://www.facebook.com/profile.php?id=100057657819811#', '', '', '', '', '', '', '');

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `impressions`
--

CREATE TABLE `impressions` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `alt` varchar(255) DEFAULT NULL,
  `path` varchar(255) NOT NULL,
  `category_id` int(10) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Gegevens worden geëxporteerd voor tabel `impressions`
--

INSERT INTO `impressions` (`id`, `name`, `alt`, `path`, `category_id`, `created_at`) VALUES
(1, 'Test bf1', 'test', '/media/bedrijfsfotografie/flag-banner.jpg', 4, '2026-02-27 13:25:04'),
(2, 'Test bf2', 'test', '/media/bedrijfsfotografie/focus-banner.jpg', 4, '2026-02-27 13:25:24');

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `menu`
--

CREATE TABLE `menu` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `path` varchar(255) NOT NULL,
  `target` enum('_self','_blank') DEFAULT '_self',
  `parent_id` int(10) UNSIGNED DEFAULT NULL,
  `position` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Gegevens worden geëxporteerd voor tabel `menu`
--

INSERT INTO `menu` (`id`, `name`, `title`, `path`, `target`, `parent_id`, `position`, `created_at`) VALUES
(1, 'Expertise', 'Expertise', '/expertise', '_self', NULL, 1, '2026-02-06 23:16:20'),
(7, 'Studio-opname', 'Studio-opname', '/expertise/studio-opname', '_self', 1, 1, '2026-02-06 23:17:43'),
(8, 'Gezin-Generatie Shoot', 'Gezin-Generatie Shoot', '/expertise/gezin-generatie-shoot', '_self', 1, 2, '2026-02-06 23:17:43'),
(9, 'Trouwfotografie', 'Trouwfotografie', '/expertise/trouwfotografie', '_self', 1, 3, '2026-02-06 23:17:43'),
(10, 'Bedrijfsfotografie', 'Bedrijfsfotografie', '/expertise/bedrijfsfotografie', '_self', 1, 4, '2026-02-06 23:17:43'),
(11, 'Uitvaart', 'Uitvaart', '/expertise/uitvaart', '_self', 1, 5, '2026-02-06 23:17:43'),
(12, 'Fotocursus', 'Fotocursus', '/fotocursus', '_self', 17, 1, '2026-03-04 18:41:32'),
(13, 'Studio verhuur', 'Studio verhuur', '/studio-verhuur', '_self', 17, 2, '2026-03-04 18:41:55'),
(14, 'Pasfoto', 'Pasfoto', '/pasfoto', '_self', 17, 3, '2026-03-04 18:42:28'),
(15, 'Over Fotohuis Venray', 'Over Fotohuis Venray', '/over-ons', '_self', NULL, 5, '2026-03-04 18:43:43'),
(16, 'Contact', 'Contact', '/contact', '_self', NULL, 6, '2026-03-04 18:44:01'),
(17, 'Diensten', 'Diensten', '#', '_self', NULL, 2, '2026-03-04 18:45:39');

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `pages`
--

CREATE TABLE `pages` (
  `id` int(10) UNSIGNED NOT NULL,
  `template` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `google_title` varchar(255) DEFAULT NULL,
  `meta_description` text DEFAULT NULL,
  `alias` varchar(255) DEFAULT NULL,
  `banner` varchar(255) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `text` longtext DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `image_alt` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `seo_follow` tinyint(1) NOT NULL,
  `seo_index` tinyint(1) NOT NULL,
  `seo_sitemap` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Gegevens worden geëxporteerd voor tabel `pages`
--

INSERT INTO `pages` (`id`, `template`, `name`, `google_title`, `meta_description`, `alias`, `banner`, `title`, `text`, `image_path`, `image_alt`, `created_at`, `updated_at`, `seo_follow`, `seo_index`, `seo_sitemap`) VALUES
(1, 'template', 'Studio verhuur', 'Studio verhuur Venray', NULL, 'studio-verhuur', NULL, '', '<p><strong>Het is mogelijk om bij FotoHuis Venray een studio te huren</strong> voor het fotograferen van kleine en grote groepen mensen, of producten.&nbsp;De ruimtes zijn geschikt en praktisch ingericht zodat u direct aan de slag kunt. Technische ondersteuning is bespreekbaar.</p>\r\n<p>Zo hebben wij een diversiteit in camera’s, lenzen, belichting en achterwanden die u kunt gebruiken. Natuurlijk is het ook mogelijk om uw eigen apparatuur mee te nemen. Huurder is zelf aansprakelijk bij evt. schade.</p>\r\n<p>De huur bedraagt 50,- per uur ex BTW, u kunt deze betalen na afloop van de shoot.<br>*studio huur is voor onze partnercollega’s u kunt niet zomaar 1 uurtje de studio huren!</p>\r\n<p><strong>Partner collega</strong>, zijn collega’s die ook de verkoop van hun foto’s bij ons neerleggen.<br>Door een eigen ontwikkeld software pakket met bestelserver via <a href=\"http://www.fotovakafdruk.nl\">www.fotovakafdruk.nl</a><br>Hierdoor creëer een eigen omgeving, natuurlijk krijg je mooi verkoop percentage.<br>Advies in verkoop ondersteuning – technische ondersteuning – maken van opzetjes zijn dan gewoon gratis!! Belangstelling als partner van FotohuisVenray mail u gegevens naar: info@fotohuisvenray.nl</p>\r\n<p>Daarnaast heeft het maken van foto’s in onze fotostudio een aantal voordelen:</p>\r\n<ul>\r\n<li>U kunt uw gasten ontvangen in een professionele omgeving.</li>\r\n<li>Zelf hoeft u niet te beschikken over (rand)apparatuur.</li>\r\n<li>Na het fotograferen is er de mogelijk om deze direct op groot scherm te bekijken.</li>\r\n<li>Technische ondersteuning is altijd aanwezig, deze komt bij de uren van de huur.</li>\r\n<li>FotoHuis Venray kan uw foto’s printen op diverse media.</li>\r\n</ul>\r\n<p>Zoals u dus ziet is FotoHuisVenray de ideale locatie voor beroeps en hobby fotografen.<br>Voor meer informatie neemt u gerust contact met ons op, of kom eens gerust een kijkje nemen.</p>', NULL, NULL, '2026-02-06 22:53:58', '2026-02-06 23:59:39', 1, 1, 1),
(2, 'template', 'Pasfoto', 'Pasfoto maken in Venray', NULL, 'pasfoto', NULL, 'Heb jij een nieuwe pasfoto nodig?', '<p><strong>Natuurlijk kunt U ook bij ons terecht voor pasfoto’s.</strong><br />De kosten voor een pasfoto in de winkel zijn € 12,50 per 5 foto’s. Ook voor alle andere reisdocumenten hanteren wij dezelfde prijs, extra setje voor maar € 4,-. Bij FotoHuis Venray kunt u parkeren recht voor de deur. Klanten die een bril dragen zijn bij ons ook van harte welkom, door een aangepaste belichting hebben wij geen hinder van reflectie. Bij tijfel maken we altijd 2 opname’s. Door de online afspraken mogenlijkheid zijn we erg flexibiel en kunt u al om 8:30uur terecht voor het maken van een pasfoto. </p><p><strong>Pasfoto op locatie of bij u thuis.</strong><br />Heeft u problemen om naar ons te kunnen komen? Dan komen wij toch naar u! Deze extra service is vrij uniek en daarin zijn we dan ook de enige in deze regio die dit kan. De kosten van deze locatie pasfoto bedragen € 39,- binnen rij afstand van 5 km, buiten deze regio hanteren wij een tarief van €65,- p/uur.</p><p><strong>Afkeur van de pasfoto</strong><br />Dit is natuurlijk erg vervelend niet alleen voor u maar ook voor de gemeente en voor ons natuurlijk. De kans dat bij ons een pasfoto een afkeur krijgt is bijna 0% dit komt door de juiste software maar vooral de juiste belichting. Onze belichting is zo optimaal dat brildragers bij ons met bril op de foto mogen. Bij twijfel maken we altijd 2 soorten met en zonder bril!!</p><p>Gemeente zal een afkeur formulier aan u meegeven waarin staat waar hun de foto op hebben afgekeurd. Vanaf 2017 zijn er geen andere regels ontstaan echter maken we soms de leukste dingen mee!! Oorlellen niet zichtbaar, bovenkant hoofd tellen ze bovenkant van de haren, refectie op bril glas maar geen reflectie zichtbaar. De amtenaar doet natuurlijk zijn best maar zonder certificering kunnen ze dus een pasfoto afkeuren. Alle pasfoto’s die wij maken krijgen een NL paspoort keuring via de software idphoto pro.   </p><p><strong>U kunt hier alvast een afspraak maken met uw gemeente.</strong></p><ul><li><a href=\"https://www.venray.nl/paspoort-0\">Gemeente Venray</a></li><li><a href=\"https://afspraakmaken.horstaandemaas.nl/InternetAppointments/product=1\">Gemeente Horst aan de Maas</a></li><li><a href=\"https://webmail.bergen.nl/Internet_afspraken/\">Gemeente Bergen</a></li><li><a href=\"https://www.boxmeer.nl/inwoners/onderwerpen-a-z_41397/product/paspoort_223.html\">Gemeente Boxmeer</a></li><li><a href=\"https://www.deurne.nl/home/paspoortidrijbewijs_42779/\">Gemeente Deurne</a></li></ul>', NULL, NULL, '2026-02-06 22:55:50', '2026-03-04 21:05:45', 1, 1, 1),
(3, 'template', 'Fotocursus', 'Fotocursus in Venray', NULL, 'fotocursus', NULL, 'Interesse in een fotocursus', '<p>Ook voor een leerzame fotocursus kunt u bij ons terecht.  Bij deze fotocursus leert u omgaan met uw eigen spiegelreflex camera.</p><p>De cursus bestaat uit twee blokken van ieder 5 lessen. U kunt er zelf voor kiezen of u na 5 lessen door gaat met de cursus. De kosten per blok zijn €140,-. De cursus vindt altijd in de avond plaats, afhankelijk van de cursisten (meestal 4/6 personen).</p><p>Lessen zijn normaal op de maandag avond tussen 19:30 uur 21:30 uur.</p><p>De eerste lessen gaat het vooral over het begrijpen van de diafragma, sluitertijd en de ISO waarde. We gaan zelf ook veel foto’s maken, want vooral door het te doen ga je het begrijpen! Zo gaan we buiten fotograferen, komt er een model in de studio die iedereen gaat fotograferen en nog veel meer! Ook maken we 2 toetsen om te kijken of er nog dingetjes zijn waar we tegen aan lopen. Dit is echt een super leuke en leerzame cursus.</p>', NULL, NULL, '2026-02-06 22:56:27', '2026-03-04 21:04:59', 1, 1, 1),
(4, 'template', 'Over Fotohuis Venray', 'Over Fotohuis Venray', NULL, 'over-ons', NULL, 'Het verhaal achter FotoHuis Venray', '<p>FotoHuis Venray is het adres voor pasfoto’s, trouwfotografie, studiofotografie, bedrijfsfotografie, prints op diverse media, vormgeving, drukwerk en sinds kort ook onze eigen lijstenmakerij. Daarnaast kunnen (hobby) fotografen de studio huren (inclusief gebruik studio-apparatuur) voor shoots die om (een grotere) studio vragen. Ook worden er fotocursussen voor beginnende en gevorderde fotograven aangeboden. We hebben echt alles onder een dak. Bent u geïnteresseerd in wat wij voor u kunnen betekenen? Kom een keer langs of neem vrijblijvend contact op. U vindt ons op de Plataanstraat 2 te Venray tel: 0478-580974</p>', NULL, NULL, '2026-02-06 23:01:47', '2026-03-04 21:05:13', 1, 1, 1),
(5, 'template-overview', 'Expertise', 'Mijn Expertise', NULL, 'expertise', '/media/bedrijfsfotografie/flag-banner.jpg', 'Mijn expertise', '<p>FotoHuis Venray is het adres voor pasfoto\'s, trouwfotografie, studiofotografie, bedrijfsfotografie, prints op diverse media, vormgeving, drukwerk en onze eigen lijstenmakerij. We hebben echt alles onder één dak.</p>', '/media/bedrijfsfotografie/fraw-banner.jpg', NULL, '2026-02-06 23:20:56', '2026-03-04 21:04:32', 1, 1, 1),
(6, 'template-home', 'Fotohuis Venray', 'De foto specialist van Venray', 'FotoHuis Venray: Hét adres voor professionele fotografie, pasfoto\'s, drukwerk en lijstenmakerij. Alles onder één dak voor uw mooiste herinneringen in Venray', '/', NULL, 'Wat kun je verwachten', '<p>FotoHuis Venray is het adres voor pasfoto\'s, trouwfotografie, studiofotografie, bedrijfsfotografie, prints op diverse media, vormgeving, drukwerk en onze eigen lijstenmakerij. We hebben echt alles onder één dak.</p><p>Fotografen kunnen de studio huren inclusief gebruik van studio-apparatuur. Daarnaast bieden wij fotocursussen aan voor zowel beginners als gevorderden.</p><p><a class=\"btn btn-primary\" href=\"/over-ons\">Meer over Fotohuis Venray</a></p>', '/media/bedrijfsfotografie/thyron-banner.jpg', NULL, '2026-02-06 23:24:25', '2026-03-04 20:24:44', 1, 1, 1),
(7, 'template', 'Pagina niet gevonden', '404 – Pagina niet gevonden', 'De pagina die je zoekt bestaat niet.', '404', NULL, 'Deze pagina bestaat niet', NULL, NULL, NULL, '2026-02-07 00:06:10', '2026-03-04 21:05:29', 0, 0, 0),
(9, 'template', 'Contact', 'contact', 'Neem contact op', 'contact', '/media/bedrijfsfotografie/flag-banner.jpg', 'Kom langs voor een kopje koffie', NULL, '/media/bedrijfsfotografie/flag-banner.jpg', NULL, '2026-03-04 21:14:18', '2026-03-04 21:14:18', 1, 1, 1);

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `private_pages`
--

CREATE TABLE `private_pages` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `view` varchar(255) NOT NULL,
  `alias` varchar(255) NOT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `position` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Gegevens worden geëxporteerd voor tabel `private_pages`
--

INSERT INTO `private_pages` (`id`, `name`, `view`, `alias`, `role`, `position`) VALUES
(1, 'Account', 'account', 'cms/account', 'user', 1),
(2, 'Dashboard', 'dashboard', 'cms/dashboard', 'user', 2),
(3, 'Pages', 'pages', 'cms/pages', 'user', 10),
(4, 'Categories', 'categories', 'cms/categories', 'user', 11),
(5, 'Impression', 'impression', 'cms/impression', 'user', 12),
(6, 'General', 'general', 'cms/general', 'user', 20),
(7, 'Redirects', 'redirects', 'cms/redirects', 'user', 21),
(8, 'Media', 'media', 'cms/media', 'user', 22),
(9, 'Users', 'users', 'cms/users', 'admin', 30);

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `redirects`
--

CREATE TABLE `redirects` (
  `id` int(11) NOT NULL,
  `from` varchar(255) NOT NULL,
  `to` varchar(255) NOT NULL,
  `type` enum('301','302') DEFAULT '301'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Gegevens worden geëxporteerd voor tabel `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `active`, `created_at`, `updated_at`) VALUES
(1, 'Sem', 'semvb1113@gmail.com ', '$2b$12$cGFl/5gMw9tJWpHtBCfSou5f9qOHfESeh9e/S.P0Xo72FwkuUzY8y', 'admin', 1, '2026-02-07 02:04:12', '2026-02-27 13:29:03');

--
-- Indexen voor geëxporteerde tabellen
--

--
-- Indexen voor tabel `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexen voor tabel `company_info`
--
ALTER TABLE `company_info`
  ADD PRIMARY KEY (`id`);

--
-- Indexen voor tabel `impressions`
--
ALTER TABLE `impressions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_impressions_category` (`category_id`);

--
-- Indexen voor tabel `menu`
--
ALTER TABLE `menu`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_menu_parent` (`parent_id`);

--
-- Indexen voor tabel `pages`
--
ALTER TABLE `pages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `alias` (`alias`);

--
-- Indexen voor tabel `private_pages`
--
ALTER TABLE `private_pages`
  ADD PRIMARY KEY (`id`);

--
-- Indexen voor tabel `redirects`
--
ALTER TABLE `redirects`
  ADD PRIMARY KEY (`id`);

--
-- Indexen voor tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT voor geëxporteerde tabellen
--

--
-- AUTO_INCREMENT voor een tabel `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT voor een tabel `company_info`
--
ALTER TABLE `company_info`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT voor een tabel `impressions`
--
ALTER TABLE `impressions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT voor een tabel `menu`
--
ALTER TABLE `menu`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT voor een tabel `pages`
--
ALTER TABLE `pages`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT voor een tabel `private_pages`
--
ALTER TABLE `private_pages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT voor een tabel `redirects`
--
ALTER TABLE `redirects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT voor een tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Beperkingen voor geëxporteerde tabellen
--

--
-- Beperkingen voor tabel `impressions`
--
ALTER TABLE `impressions`
  ADD CONSTRAINT `fk_impressions_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE;

--
-- Beperkingen voor tabel `menu`
--
ALTER TABLE `menu`
  ADD CONSTRAINT `fk_menu_parent` FOREIGN KEY (`parent_id`) REFERENCES `menu` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
