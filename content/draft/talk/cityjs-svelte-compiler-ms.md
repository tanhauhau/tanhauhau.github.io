Dengan modern web framework, kita bisa menulis **UI** kita secara deklaratif, UI kita secara function of a state aplikasi kita

Function ini bisa ditulis secara template, atau sintaks yang macam template, sintaks yang bisa menerangkan bahawa, macam mana UI akan ditampilkan di semua kemungkinan state aplikasi.

Ketika state berubah, tampilan juga harus berubah.

kita tidak perlu menjelaskan bagaimana satu view beralih ke view seterusnya. kita tidak perlu menjelaskan elemen apa yang akan ditambahkan, dihapus atau dimodifikasi

**Modern Web Framework melakukannya untuk kita.**

`framework_magic` mengambil 2 view berikutnya dan mencari cara untuk beralih dari 1 view ke view yang kemudian.

Modern Web Framework seperti React dan Vue melakukannya menggunakan teknik yang disebut sebagai Virtual DOM.

Untuk menangani semua senario yang mungkin, code size `framework_magic` ini mungkin sangat besar, dan ia tidak berkaitan dengan kode aplikasi kami.

react adalah 40kb gzip dan vue2 adalah 23kb gzip, vue3 adalah 10kb.

dan jika aplikasi anda sederhana, aplikasi anda mungkin sangat kecil dari segi ukuran kod berbanding dengan framework library, yang ditunjukkan di bahagian abu-abu pada chart ini.

Namun, **web frameworks tidak semestinya begini**.

bagaimana jika kita bisa mengalihkan semua kerja yang dilakukan dalam `framework_magic` dari runtime ke build time?

kita dapat menganalisis kod dan mengetahui semua kemungkinan state dan view, dan kemungkinan transisi di antara mereka, dan menghasilkan kod yang hanya cukup untuk render semua kemungkinan?

nah, inilah idea utama Svelte.

Svelte compiler mengompilasi kod Svelte menjadi **kode JavaScript yang dioptimalkan** dan code sizenya bertumbuh secara linear relatif terhadap kod aplikasi kita.

hari ini, kita akan melihat macam mana Svelte compiler berfungsi.

Jangan khawatir kalau anda tidak biasa dengan Svelte atau compiler, saya akan mencoba sebaik mungkin untuk mengelakkan jargon dan menjelaskan idea umum proses kompilasi.

---

Nama saya Tan Li Hau, seorang frontend engineer di Shopee Singapore.

Saya berasal dari Pulau Pinang, Malaysia. Pulau Pinang juga dikenali sebagai syurga makanan. Makanan seperti 'Char Koay Teow', 'rojak', merupakan kesukaan saya. ia mempunyai rasanya yang tersendiri yang hanya boleh didapati di Pulau Pinang.

setelah pandemi virus corona COVID-19 berakhir, jom datang berkunjung ke malaysia menikmati makanan pulau pinang.

last but not least, saya juga salah satu maintainer svelte

---

Sebelum kita mula bercakap tentang kompiler, mari kita melihat dulu bagaimana kita menulis komponen Svelte.

komponen svelte ditulis dalam file dengan ekstensi `.svelte`. ^^ setiap fail menerangkan 1 komponen svelte ^^.

^^ anda boleh menambah 1 tag skrip kepada komponen. ^^ anda boleh menentukan variabel dalam tag skrip, sama dengan macam anda lakukan dalam javascript, ^^ anda dapat mereferensikan variabel dalam templat html anda, dengan kurungan keriting.

^^ anda boleh gunakan direktif untuk menambah pendengar acara, anda menggunakan arahan `on:`, dan anda boleh mengemas kini pemboleh ubah seperti ini, dan ia akan dikemas kini secara automatik di DOM anda.

^^ anda boleh menambah tag gaya dan menulis beberapa css untuk menggayakan komponen anda. Apa yang menarik mengenainya || adakah itu, css dicakup dalam komponen. jadi apabila saya katakan butang, latar belakang: merah, hanya butang yang ditulis dalam fail komponen ini yang mempunyai latar belakang berwarna merah. bukan komponen anak, bukan komponen induk. hanya komponen ini.

** sekarang **, berikut adalah salah satu ciri deklarasi reaktif yang paling kuat dan agak kontroversial.

di sini anda mempunyai dua = hitung \ * 2, dengan tanda dolar + titik dua di hadapan penyataan. ini bermaksud bahawa pemboleh ubah `double` selalu 2 kali` hitung`, setiap kali nilai `kiraan` telah berubah, nilai` ganda 'akan dikemas kini juga.

<! - dalam beberapa bahasa pengaturcaraan, ini disebut pengendali takdir ->

Ini pasti terasa pelik pada mulanya, tetapi semakin banyak anda menggunakannya, anda akan bertanya pada diri sendiri mengapa kami tidak memilikinya lebih awal.

Jadi, di sini kita mempunyai 1 butang merah besar, dan teks persamaan darab sebagai komponen Svelte.

Saya akan berhenti sebentar di sini, dan mengajukan soalan ini kepada anda, ** bagaimana anda akan melaksanakannya, jika anda tidak dibenarkan menggunakan kerangka apa pun dan anda harus menulisnya dalam JavaScript Vanilla? **

(berhenti seketika)

Oleh itu, pertama kita akan memulakan dengan deklarasi pemboleh ubah.

Seterusnya kita membuat teks dengan document.createTextNode, dan memasukkannya ke induk

Seterusnya kami membuat butang, menukar teks, menambahkan pendengar acara dan memasukkannya ke ibu bapa.

Untuk mengemas kini teks ketika hitungan diperbarui, kami membuat fungsi pembaruan, di mana kami mengemas kini nilai ganda dan mengemas kini kandungan teks.

Akhirnya untuk tag gaya, kami membuat tag gaya, menetapkan isi dan memasukkan ke kepala.

Untuk memastikan bahawa butang hanya mensasarkan butang ini yang baru kami buat, kami menambahkan kelas pada butang tersebut.

Di sini nama kelas adalah rawak, tetapi dapat dihasilkan berdasarkan hash kod gaya, sehingga anda mendapat nama kelas yang konsisten.

(TODO: KLIK UNTUK MELIHAT OUTPUT JS)

Sebenarnya jika anda melihat output JS yang dihasilkan oleh svelte, ia sangat serupa dengan kod yang baru saja kita tulis.

Jadi, ini hanya kod yang anda perlukan untuk ** membuat butang dan teks **. Anda tidak memerlukan perpustakaan DOM Maya 40KB untuk mencipta komponen yang sama.

Sudah tentu, anda tidak perlu menulis semua ini sendiri.

Penyusun Svelte akan melakukannya untuk anda. Ia akan menganalisis kod di atas, dan menghasilkan kod di bawah untuk anda.

Dan sekarang, jika anda cuba memilih "SSR" sebagai output yang dihasilkan, anda dapat melihat sekarang Svelte menghasilkan fungsi yang mengembalikan rentetan yang disusun menggunakan literal templat.

Ini adalah beberapa pesanan yang lebih berkesan daripada menghasilkan objek pokok dan menyusunnya menjadi rentetan HTML.

(JANGAN BERGERAK)

Oleh itu, Mari kita ambil beberapa lagi contoh sintaks Svelte, dan selama ini, saya harap anda bertanya kepada diri sendiri soalan ini, ** "bagaimana saya menukar ini / menulis ini dalam JavaScript biasa?" **

dan jangan bimbang, anda boleh mendapatkan jawapan ini di laman web svelte. dan anda boleh membandingkan input dan output js mengikut kehendak anda.

(OKE SEKARANG BERGERAK)
---

Untuk menyatakan logik dalam templat, Svelte menyediakan blok logik, seperti ** `{#if}` **, ** `{#await}` **, dan ** `{#each}` **.

Untuk mengurangkan kod pelat boiler untuk mengikat pemboleh ubah ke input, Svelte memberikan arahan `bind: '.

Untuk menyediakan peralihan bagi elemen yang masuk atau keluar dari DOM, Svelte memberikan arahan `transisi`,` in` dan `out`.

Untuk menyusun Komponen, Svelte menyediakan slot dan templat yang serupa dengan API Komponen Web.

Ada banyak yang ingin saya kongsikan di sini, tetapi saya harus memilih penyusun Svelte, kerana itulah topik utama perbincangan hari ini.

---

Sekarang, akhirnya, mari kita lihat penyusun Svelte.

Jadi, bagaimana penyusun berfungsi?

Penyusun pertama membaca kod anda, dan memecahnya menjadi beberapa bahagian yang lebih kecil, yang disebut token.

Penyusun kemudian melalui senarai token ini dan menyusunnya ke dalam struktur pokok, mengikut tatabahasa bahasa. Struktur pokok adalah apa yang disebut oleh penyusun "Pohon sintaks abstrak" atau AST.

AST adalah perwakilan pokok kod input.

Dan apa yang kadang-kadang dilakukan penyusun, adalah menganalisis dan menerapkan transformasi ke AST.
Menggunakan algoritma melintasi pokok, seperti carian pertama yang mendalam

Dan akhirnya, penyusun menghasilkan output kod berdasarkan AST akhir.

Ringkasnya, proses penyusunan generik melibatkan penghuraian kod ke AST, melakukan analisis, pengoptimuman atau transformasi pada AST, dan kemudian menghasilkan kod keluar dari AST.
<! - Berikut adalah beberapa sumber di web yang biasa saya pelajari mengenai penyusun. ->

---

Akhirnya, mari kita lihat bagaimana penyusun Svelte berfungsi.

Svelte menguraikan kod Svelte ke dalam AST
Svelte kemudian menganalisis AST, yang akan kami terokai secara terperinci kemudian.
Dengan analisisnya, Svelte menghasilkan kod JavaScript bergantung pada sasaran kompilasi, sama ada untuk SSR atau untuk penyemak imbas.
Akhirnya, js dan css dihasilkan, dan boleh ditulis ke dalam fail atau digunakan oleh proses membina anda.

---

Oleh itu mari kita mulakan dari awal, penghuraian.

---

Berikut adalah komponen Svelte yang akan kita gunakan sepanjang perbincangan ini.

Svelte, || melaksanakan penghurai sendiri

Itu menguraikan sintaks html…
... serta blok logik, seperti masing-masing, jika, dan menunggu

Kerana js adalah bahasa yang cukup kompleks, setiap kali bertemu dengan svelte || tag skrip, || atau kurungan keriting, || ia akan menyerahkannya kepada acorn, pengurai JavaScript ringan, untuk menguraikan kandungan JS.
Perkara yang sama berlaku dengan css juga. svelte menggunakan css-tree untuk menguraikan kandungan CSS di antara tag gaya.

<! - Dalam komponen svelte, Anda hanya dibenarkan memiliki 1 skrip modul, 1 skrip instance, dan 1 tag gaya di tingkat atas. ->

Oleh itu, melalui proses tersebut, kod svelte dipecah menjadi token, dan disusun ke dalam Svelte AST.

Sekiranya anda berminat untuk melihat bagaimana Svelte AST, anda boleh melihatnya di ASTExplorer.net.

Langkah seterusnya adalah menganalisis AST.

Di sini, kod kami sudah ada di AST, || TETAPI untuk membantu memvisualisasikan prosesnya, saya akan menunjukkan kod asal.

Perkara pertama yang dilakukan Svelte || adalah untuk melintasi skrip AST.

Setiap kali menemui pemboleh ubah, dalam kes ini, hitung, ia akan mencatat nama pemboleh ubah.

di sini kita mencatat nilai || dan berganda.

"berganda" di sini, || dalam kod svelte ini || adalah pemboleh ubah dinyatakan reaktif. tetapi untuk vanilla JavaScript, kami memberikan nilai pada pemboleh ubah "double" ini, yang tidak dinyatakan di mana saja.

dalam mod ketat, ini adalah kesalahan "tugasan kepada pemboleh ubah yang tidak diisytiharkan".

Svelte menandakan pemboleh ubah, "berganda", sebagai "disuntikkan", jadi pengisytiharan pemboleh ubah akan disuntik kemudian. contoh lain dari pemboleh ubah yang disuntik adalah svelte magic global, seperti $$ props, atau $ awalan pemboleh ubah kedai.

di sini kita menemui "hitungan" sekali lagi, kali ini menjadi rujukan, bukannya disandarkan pada nilai, dan ia digunakan untuk menghitung nilai dua kali ganda. || jadi kami menarik hubungan kebergantungan antara kiraan dan dua kali ganda. || jadi berganda bergantung kepada kiraan.

Jom sambung.

di sini kita melihat data. data tidak dinyatakan pada skop tahap atas, kerana dalam skop blok kurungan keriting. jadi kami tidak akan merakamnya.

perkara yang sama berlaku dengan `i`.

di sini kami menemui dua kali ganda, jadi kami menandakannya sebagai rujukan.

Math, js global, kita akan mengabaikannya.

di sini `nilai` diturunkan.

sekarang kita mencapai akhir skrip, langkah seterusnya adalah melintasi templat AST.

kita mulakan dari elemen `input`, yang mempunyai` bind: value`.

Di sini kita mengikat nilai input ke pemboleh ubah `count '. jadi kami menandakan `count` sebagai dirujuk dari templat dan dimutasi.

Sekarang kami menemui setiap blok. Di sini kita melakukan iterasi melalui pembolehubah `nilai 'dan kita menggunakan pemboleh ubah` nilai` untuk setiap item. Jadi templat dalam setiap blok || akan mempunyai skop baru, di mana `nilai` dinyatakan. || Juga, kami menandakan `nilai` sebagai kebergantungan setiap blok. || Ini bermaksud bahawa setiap kali `nilai` berubah, kita akan mengemas kini setiap blok.


... dan, kami menandakan nilai sebagai rujukan juga.

seterusnya, kita beralih ke setiap blok dan elemen div. Di sini kita menandakan `value` sebagai dirujuk dari templat, kita menemui` value` lagi || dan kita telah mencapai akhir templat.

dan Svelte melalui skrip sekali lagi, kali ini terutamanya untuk pengoptimuman. || mencari tahu pemboleh ubah mana yang tidak dirujuk, dan tidak perlu reaktif.

Begitu juga, jika ketergantungan deklarasi reaktif tidak akan pernah berubah, || dengan melihat sama ada kebergantungan mereka ditandai sebagai bermutasi, || kita boleh menandakannya sebagai statik, yang lebih cekap, dan lebih kecil dalam ukuran kod.

Seterusnya, Svelte melintasi gaya.

untuk setiap pemilih, ia akan menentukan sama ada ia akan sesuai dengan elemen dalam templat, || dan jika ya, svelte akan menambahkan nama kelas svelte-hash ke pemilih serta eelement yang sesuai. || Walaupun ini akan meningkatkan kekhususan pemilih, tetapi itu akan menjadikan pemilih hanya terpakai pada komponen svelte semasa.

Pada akhir langkah ini, Svelte telah mengetahui semua pemboleh ubah yang dinyatakan, tingkah laku dan hubungan mereka.

Dengan ini, kita beralih ke fasa rendering.

---

Langkah ini adalah di mana svelte akan menghasilkan kod javascript.
Terdapat 2 sasaran kompilasi yang berbeza, 1 adalah DOM, untuk pelanggan, dan yang lain adalah ssr, untuk bahagian pelayan.

Mari pertama-tama kita melihat sasaran dom render.

Di sini kita mempunyai kod sumber. dan berikut adalah garis besar bagaimana rupa output dom.

Inilah yang saya namakan blok serpihan. fungsi create fragment mengembalikan objek, yang bertindak sebagai resipi untuk membuat elemen dalam komponen. setiap kaedah dalam objek resipi, mewakili tahap dalam kitaran hidup komponen, di sini kita mempunyai `c` untuk` create`, `m` untuk` mounting`, `p` for` update`, dan `d` for` destr` .

seterusnya, kita mempunyai fungsi contoh. di sinilah logik keadaan dan komponen masuk.

akhirnya kami mempunyai kelas komponen svelte. jadi setiap komponen svelte disusun menjadi kelas || yang merupakan eksport lalai. dalam konstruktor, seperti yang anda lihat, memanggil fungsi `init` || yang mengambil fungsi `instance` dan` create_fragment`. dan ini adalah bagaimana 3 kepingan komponen svelte yang berbeza || datang bersama.

Sekarang, svelte berjalan melalui templat sekali lagi, dan mula memasukkan kod ke dalam output.

Mula-mula kita mempunyai elemen input. kami memasukkan arahan untuk membuat elemen input, || memasang elemen ke sasaran, || dan keluarkan elemen dari sasaran.

seterusnya kita mempunyai pengikatan nilai input ke pemboleh ubah `count`. kita memerlukan pengendali input untuk mendengar perubahan input, jadi kita dapat mengemas kini nilai pemboleh ubah `count`. || di sini kita mengeluarkan senarai pemboleh ubah, dan menambahkan `input_handler`.

kami menetapkan nilai input berdasarkan kiraan pemboleh ubah || dan tambahkan pendengar acara untuk perubahan input || yang mana kita harus membuang pendengar peristiwa ketika kita memusnahkan komponen.

dan dalam fasa kemas kini, jika `kiraan` telah berubah, kita perlu mengemas kini nilai input berdasarkan nilai` kiraan`.

seterusnya kita bergerak ke blok masing-masing.

kami membuat blok fragmen baru untuk setiap blok, yang mengandungi resipi untuk membuat elemen untuk 1 setiap item. Dan kerana di setiap blok kita memiliki ruang lingkup anak yang menentukan variabel `value`, kita memiliki fungsi` get_each_context` untuk menirunya.

Di sini kita terus maju melalui langkah-langkah, di mana untuk setiap elemen, kita memasukkan kod bagaimana kita membuat, memasang, mengemas kini dan memusnahkannya. Sekiranya anda berminat untuk mengetahui perinciannya, anda boleh melihat rangkaian blog saya, yang disebut "Compile Svelte in your head".

Sekarang kita melihat bagaimana Svelte mengisi fungsi instance. Dalam kebanyakan kes, Svelte hanya menyalin apa sahaja yang ditulis dalam tag `<script>`.

Untuk pernyataan reaktif, mereka ditambahkan di dalam fungsi `$$. Update`, || dan untuk setiap pernyataan, kami menambahkan pernyataan if untuk memeriksa apakah ketergantungan mereka telah berubah, berdasarkan hubungan ketergantungan yang telah kami lukis sebelumnya.

Sekarang kita perlu menyatakan dan menambahkan pemboleh ubah yang disuntikkan.

Akhirnya, kami mengembalikan senarai pemboleh ubah yang ** dirujuk oleh templat ** sahaja.

Sekarang, untuk menjadikan pemboleh ubah benar-benar reaktif, kami menginstruksikan `$$ validate` setelah setiap pernyataan tugasan, sehingga akan memulakan pusingan pembaruan seterusnya.

Jadi di sini anda memilikinya, output kompilasi untuk sasaran DOM.

Mari kita lihat dengan cepat bagaimana perkara-perkara berjalan untuk menyusun sasaran SSR.

Struktur kod output untuk sasaran SSR jauh lebih mudah. ia adalah fungsi yang mengembalikan rentetan.

Kerana tidak perlu ada reaktiviti yang diperlukan di pelayan, kita dapat menyalin kod kata demi kata dari tag skrip. || perkara yang sama berlaku dengan deklarasi reaktif, tentu kita perlu ingat untuk menyatakan pemboleh ubah yang disuntikkan, `double '.

semasa kita melintasi templat, kita menambahkan rentetan atau ungkapan sisipan ke dalam templat output secara literal. Untuk setiap blok, kami melakukan iterasi melalui pembolehubah `nilai` dan mengembalikan elemen anak sebagai rentetan.

Dan di sana anda pergi, kod output komponen svelte untuk SSR.

---

Akhirnya, Svelte mengeluarkan kod dalam JS dan CSS, dengan kod sebagai rentetan dan juga peta sumber.

Ini boleh ditulis ke dalam sistem fail secara langsung, atau dimakan oleh bundler modul anda, seperti rollup-svelte-plugin dalam rollup atau svelte-loader untuk webpack.

Oleh itu mari kita kaji semula saluran penyusunan svelte,
Svelte menguraikan kod menjadi ast, menjalankan serangkaian langkah untuk menganalisis kod, mengesan rujukan dan pergantungan pemboleh ubah. Kemudian svelte menghasilkan kod bergantung pada sasaran kompilasi, sama ada untuk sisi pelanggan atau sisi pelayan.
Dan output dari langkah render adalah dari segi JS dan CSS, yang dapat ditulis ke dalam file / digunakan oleh alat binaan anda.

Terima kasih banyak mendengar. Sekiranya anda ingin mengetahui lebih lanjut mengenai svelte, atau jika anda mempunyai pertanyaan mengenai svelte, anda boleh mengikuti saya di twitter. Saya lihau. semoga anda bersenang-senang dengan perbincangan sepanjang persidangan. jumpa lagi.