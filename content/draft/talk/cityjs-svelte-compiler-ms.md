selamat malam saudara saudari, hari ini saya akan cuba memberi sharing ini dalam bahasa indonesia. walaupun saya berasal dari malaysia, saya tidak pernah memberi ceramah dalam melayu.

inilah kali pertama saya.

jadi saya mempersiapkan skrip, dan menterjermahkan kebanyakan skrip saya ke dalam bahasa indonesia dengan google translate.
harap maafkan kalau saya terdengar aneh.

---

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

^^ kita boleh menambah 1 tag skrip kepada komponen. ^^ kita boleh menentukan variabel dalam tag skrip macam ini, ^^ lepas itu, kita boleh merujuk variabel ini dalam templat html kita, dengan "curly bracket".

^^ kita boleh gunakan direktif untuk menambah event listener. ^^ kalau kita ubah variabel macam ini, nilainya akan diperbarui di DOM.

^^ kita boleh menambah tag style dan menulis CSS dalamnya supaya komponen kita lebih menarik. CSS dalam komponen Svelte hanya mengubah elemen-elemen dalam fail komponen ini sahaja. sebagai contoh, kalau saya tambah `button background: red`, hanya buttun yang ditulis dalam fail komponen ini yang backgroundnya merah. bukan komponen anak, bukan komponen parent. hanya komponen ini.

nah ini adalah salah satu fitur svelte yang paling kontroversial, deklarasi reaktif, ataupun reactive declaration.

di sini saya tulis double = count kali (*) 2, dengan tanda dolar + titik dua di depan pernyataan. ini berarti variabel `double` selalu 2 kali `count`, setiap kali nilai `count` berubah, nilai `double` juga akan diperbarui.

Ini pasti terasa aneh pada awalnya, tetapi semakin banyak anda menggunakannya, anda akan bertanya pada diri sendiri mengapa kami tidak memiliki ini sebelumnya.

nah, di sini kita mempunyai 1 butang merah besar, dan teks persamaan perkalian sebagai komponen Svelte.

Saya akan berhenti sebentar di sini, dan menanyakan soalan ini, **jika anda tidak dibenarkan menggunakan framework apa pun, bagaimana anda akan menulis komponen semacam ini dalam JavaScript sahaja? **

(pause)

Bagi saya, pertama-tama saya akan mulai dengan deklarasi variabel.

Seterusnya saya membuat teks dengan document.createTextNode, dan memasukkannya ke parentnya

Seterusnya saya membuat button, ubah teks, tambahkan event listener dan masukkannya ke parentnya.

Untuk memperbarui teks button ini, saya menulis fungsi update, dan memperbarui nilai `double` dan merperbarui kandungan teks button.

Terakhirnya, saya membuat tag `<style>`, menyalin deklarasi CSS ke dalamnya, dan memasukkannya ke dalam head.

Untuk memastikan bahwa CSS hanya mengubah tampilan tombol yang baru saya buat, saya boleh menambah satu lagi kelas kepada tombol tersebut.

Di sini nama kelas adalah random. saya boleh gunakan hash kode saya untuk mendapat nama kelas yang konsisten.

(TODO: click to see output js)

Sebenarnya jika anda melihat output JS yang dihasilkan oleh svelte, ia sangat mirip dengan kod yang baru saja saya tulis.

Jadi, ini hanyalah kod yang anda perlukan untuk ** membuat tombol dan teks **. Anda tidak memerlukan library virtual DOM 40KB untuk membuat ulang komponen yang sama.

Sudah tentu, anda tidak perlu menulis semuanya sendiri.

Kompiler Svelte akan melakukannya untuk anda. Ia akan menganalisis kod di atas, dan menghasilkan kod di bawah untuk anda.

Dan sekarang, jika anda cuba memilih "SSR" sebagai output yang dihasilkan, anda dapat melihat sekarang Svelte menghasilkan fungsi yang mengembalikan string yang dibuat menggunakan template literal.

Ini adalah lebih berefisien berbanding dengan framework yang lain.

(dont move)

Jadi, Mari kita ambil beberapa contoh Svelte lagi, dan selama ini, saya harap anda bertanya pada diri sendiri soalan ini, ** "bagaimana cara menulis komponen ini dalama JavaScript sahaja?" **

dan jangan khawatir, anda boleh mengunakan situs svelte untuk membandingkan input dan output js dan belajar darinya.

(okay move now)
---

Untuk mengekspresikan logik dalam templat, Svelte menyediakan blok logik, seperti ** `{#if}` **, ** `{#await}` **, dan ** `{#each}` **.

Untuk mengurangi kode perlu ditulis untuk mengikat variabel ke input, Svelte menyediakan direktif `bind:`.

Untuk memberikan transisi untuk elemen yang masuk atau keluar dari DOM, Svelte menyediakan direktif `transition`,` in` dan `out`.

Untuk membuat Komponen, Svelte menyediakan slot dan templat yang mirip dengan API Web Components.

Masih banyak lagi fitur Svelte yang saya ingin kongsikan di sini, tetapi saya harus beralih ke kompiler Svelte, kerana itulah topik utama pembicaraan hari ini.

---

Sekarang, mari kita lihat kompiler Svelte.

Jadi, bagaimana cara kerja kompiler?

Tahap pertama, parsing. Kompiler membaca kod anda, dan memecahnya menjadi bagian-bagian yang lebih kecil, yang disebut token.

Tahap kemudian, kompiler menyusun token-token ini ke dalam struktur pohon, mengikuti aturan sintaksnya. Struktur pohon ini disebut "Pohon sintaks abstrak" atau Abstract Syntax Tree (AST).

Tahap kemudian Kemudian, kompiler akan melakukan analisis dan transformasi kepada pohon sintaks abstrak.

Dan tahap akhirnya, kompiler membangkit kod berdasarkan pohon sintaks abstrak terakhir.

Singkatnya, proses kompilasi melibatkan parsing, melakukan analisis, pengoptimalan, atau transformasi pada pohon sintaks abstrak, dan kemudian menghasilkan kod dari pohon sintaks abstrak.

<!- Berikut adalah beberapa sumber di web yang biasa saya pelajari mengenai penyusun. ->

---

Lalu, mari kita lihat cara kerja kompiler Svelte.

Svelte mem-parse kod Svelte ke dalam pohon sintaks abstrak
Svelte kemudian menganalisis pohon sintaks abstrak, yang akan kita bahas lebih lanjut nanti.
Dengan analisisnya, Svelte menghasilkan kod JavaScript bergantung pada target kompilasi, sama ada untuk SSR atau untuk browser.
Akhirnya, js dan css dihasilkan, dan boleh ditulis ke dalam fail atau digunakan oleh proses build.

---

Jadi, mari kita mulai dari awal, parsing.

---

Berikut adalah komponen Svelte yang akan kita gunakan sepanjang pembicaraan ini.

Svelte, || mengimplementasikan parsernya sendiri

yang boleh parse sintaks html…
... dan juga blok logik, seperti each, if, dan await

Kerana js adalah bahasa yang cukup kompleks, setiap kali svelte bertemu dengan || tag skrip, || atau tanda kurung kurawal, || ia akan menyerahkannya kepada acorn, parser JavaScript yang amat ringan, untuk mem-parse-ken kandungan JS.
Hal yang sama juga terjadi dengan css. svelte menggunakan css-tree untuk mem-parse kandungan CSS di antara tag style.

<! - Dalam komponen svelte, Anda hanya dibenarkan memiliki 1 skrip modul, 1 skrip instance, dan 1 tag style. ->

Jadi, melalui proses parsing, kod svelte dipecah menjadi token, dan disusun menjadi pohon sintaks abstrak Svelte.

Sekiranya anda berminat untuk melihat bagaimana struktur pohon sintaks abstrak Svelte, anda dapat memeriksanya di ASTExplorer.net.

Langkah selanjutnya adalah menganalisis pohon sintaks abstrak.

Di sini, kod kita sudah menjadi pohon sintaks abstrak, || TAPI untuk membantu memvisualisasikan prosesnya, saya akan menunjukkannya dalam kod asalnya.

Perkara pertama yang dilakukan Svelte || adalah untuk melintasi pohon sintaks abstrak dalam tag skrip.

Setiap kali Svelte menemui variabel, dalam kes ini, count, ia akan mencatat nama variabel.

di sini kita mencatat values || dan double.

"double" di sini, || dalam kod svelte ini || adalah variabel dideklarasikan reaktif (reactive declared variable). tetapi bagi JavaScript, kami memberikan nilai pada variabel "double" ini, yang tidak pernah di-deklarasikan di mana pun.

dalam strict mode, ini adalah error "tugasan kepada pemboleh ubah yang tidak diisytiharkan".

Jadi, Svelte menandai variabel, "double", sebagai "injected", maknanya, deklarasi variabel ini akan disuntikkan nanti. contoh lain varaiable yang ditandai sebagai "injected" adalah svelte magic global, seperti $$props (dua tanda dolar props), atau nilai store yang direferensikan dengan tanda dollar.

di sini kita menemui "count" sekali lagi, kali ini variabel "count" direferensikan untuk menghitung nilai `double`, jadi kita manandainya sebagai "referenced". || dan juga kami menggambar hubungan ketergantungan antara `count` dan `double` || `double` tergantung pada `count`.

Jom sambung.

di sini kita menemui `data`. `data` tidak dinyatakan pada skop tahap teratas, kerana berada dalam skop blok kurung kurawal. jadi kita tidak akan mencatatnya.

variabel `i` juga tidak akan dicatat.

di sini kita menemui `double` lagi, jadi kami menandainya sebagai "referenced".

Math, variabel global di JavaScript, kita tidak akan mancatatnya

di sini, `value` dimutasi.

sekarang kita mencapai akhir skrip, langkah selanjutnya adalah melintasi pohon syntaks abstrak templat.

kita mulai dari elemen `input`, yang memiliki `bind: value`.

Di sini kita mengikat nilai input ke variabel `count`. jadi kami menandai `count` sebagai `referenced from template and mutated` iaitu, direferensikan dari templat dan akan dimutasi

Sekarang kami menemui blok `{#each}`. Di sini kita melakukan iterasi melalui variabel `values` dan kita menggunakan variabel `value` untuk setiap item. Jadi templat dalam blok {#each} || akan memiliki skop baru, di mana `value` dideklarasikan. || Juga, kami menandai `values` sebagai `dependencies` blok `{#each}`. blok `{#each}` bergantung kapada nilai `values` || Artinya setiap kali `values` berubah, kita akan memperbarui blok `{#each}`.


... dan, kami menandai `values` sebagai `referenced` juga.

selanjutnya, kita beralih ke dalam blok `{#each}` dan elemen div. Di sini kita menandakan `value` sebagai `referenced from template` referensi dari templat. kita menemui `value` lagi || dan kita telah mencapai akhir templat.

Lalu, Svelte melintasi pohon sintaks abstrak skrip sekali lagi. kali ini terutamanya untuk pengoptimalan. || contohnya, mencari variable yang mana tidak pernah direferensikan, karena ia tidak perlu ber-reaktif.

Demikian pula, jika dependency deklarasi reaktif tidak akan berubah, || dengan melihat sama ada dependencies-nya mereka ditandai sebagai `mutated`, || kita boleh menandai deklarasi reaktif sebagai deklarasi statik sahaja. jadi kod yang berhasil akan lebih efisien dan lebih kecil.

Seterusnya, Svelte melintasi tag `<style>`.

Svelte akan melihat setiap deklarasi, setiap selektor, dan menentukan sama ada ia akan diaplikasikan dengan elemen dalam templat. || jika ya, svelte akan menambahkan nama kelas hash svelte ke selektor dan juga elemen yang diaplikasikan. || Walaupun ini akan meningkatkan kekhususan (specifisitas) selektor, namun ini akan membuat selektor hanya mengubah elemen dalam elemen dalam komponen ini sahaja.

Sampai sini, Svelte telah mengetahui semua variable yang dideklarasikan, perilaku dan juga hunbungan antara variabel.

Dengan ini, kita beralih ke fasa rendering.

---

Langkah ini adalah di mana svelte akan menghasilkan kod javascript.

Ada  2 target kompilasi yang berbeda, pertama adalah DOM, untuk sisi browser, dan kedua adalah ssr, untuk sisi server.

Mari pertama-tama kita melihat target dom render.

Di kiri adalah kod asalnya. dan di kanan adalah rupa kod output ber-target dom.

Kod output boleh dibagi menjadi 3 bagian.

Bagian pertama, fungsi create fragment. Fungsi ini mengembalikan satu objek. Objek ini berfungsi sebagai resipi untuk membuat elemen dalam komponen. Setiap metode dalam objek resep mewaikili tahap siklus hidup komponen.

Contohnya, metode `c` untuk `create`, langkah untuk membuat elemen;
metode `m` untuk `mounting`, memuat elemen kepada dom;
metode `p` untuk `update`, untuk memperbarui elemen;
metode `d` untuk `destroy`, untuk menghapuskan elemen dari dom

bagian seterusnya, fungsi `instance`. di sinilah logik komponen dan state komponen berada.

bagian akhirnya, kelas komponen svelte.

setiap komponen svelte dikompilasi menjadi kelas JavaScript || kelas ini merupakan eksport default. dalam konstruktor, kita memanggil fungsi `init` || `init` mengambil fungsi `instance` dan` create_fragment`. dan beginilah, 3 bagian terpisah digabung dengan fungsi `init`.

Sekarang, svelte berjalan melalui templat sekali lagi, dan mula memasukkan kod ke dalam metode fungsi create_fragment.

Mula-mulanya, kita melihat elemen input. kita memasukkan arahan untuk membuat elemen input, || memasang elemen ke target, || dan menghapus elemen dari target.

selanjutnya kita melihat pengikatan nilai input ke variabel `count`. kita memerlukan handler input untuk mendengar perubahan input, untuk memperbarui nilai variabel `count`. || sini kita boleh mencatat variabel `input_handler` untuk nanti.

nilai input berdasarkan variabel `count` || dan tambahkan pendengar acara kepada input || harus ingat menghapus pendenger acara ketika kita menghancurkan komponen.

dan dalam fasa update, jika nilai `count` berubah, kita perlu memperbarui nilai input berdasarkan nilai `count`.

seterusnya kita beralih ke blok `{#each}`

kami akan membuat blok fragmen satu lagi untuk blok `{#each}`, untuk mengandungi resipi untuk membuat elemen bagi satu item `{#each}`. Dan kerana blok `{#each}` memiliki skop yang mendefinisikan variabel `value`, kita menulis fungsi `get_each_context` untuk menghasilkan skop ini.

Di sini kita mempercepat langkah-langkah memasukkan arahan memasang, memperbarui, dan menghapus elemen dalam blok `{#each}`. Sekiranya anda berminat untuk mengetahui perinciannya, anda boleh membaca blog saya, berjudul "Compile Svelte in your head".

Sekarang kita melihat bagaimana Svelte mengisi fungsi instance. Dalam kebanyakan kes, Svelte hanya menyalin apa sahaja yang tertulis dalam tag `<script>`.

Bagi pernyataan reaktif, Svelte menambahkannya di dalam fungsi (dua tanda dolar) `$$.update`, || dan untuk setiap pernyataan, kami menambahkan pernyataan if untuk memeriksa apakah dependency mereka telah berubah, berdasarkan hubungan dependency yang telah kami lukis sebelumnya.

Sekarang kita perlu mendeelklarasikan dan menambahkan variab yang diinjeksi tadi.

Akhirnya, kami mengembalikan senarai variabel yang ** direferensikan oleh templat (`referenced from template`) ** sahaja.

Sekarang, untuk membuat variabel benar-benar reaktif, kami melengkapi `$$.validate` setelah setiap pernyataan penugasan, untuk memulakan pusingan pembaruan seterusnya.

nah inilah output kompilasi untuk target DOM.

Mari kita lihat target SSR.

Struktur kod output untuk target SSR lebih ringkas. kod output adalah fungsi yang mengembalikan string.

Kerana kita tidak perlu reaktiviti di sisi server, kita dapat menyalin semua kod JavaScript dari tag skrip. || sama juga bagi deklarasi reaktif, harus ingat mengdeklarasikan variabel `injected`, seperti `double`

semasa kita melintasi templat, kita menambahkan string atau ekspresi. bagi blok `{#each}`, kami melakukan iterasi melalui variabel `values` dan mengembalikan elemen anak sebagai string.

Dan beginilah, kod output komponen svelte untuk SSR.

---

Akhirnya, Svelte menghasilkan kod dalam JS dan CSS, dengan kod sebagai rentetan dan juga peta sumber.

JS dan CSS dihasilkan boleh ditulis ke dalam sistem fail, atau digunakan oleh bundler modul anda, seperti rollup-svelte-plugin bagi rollup atau svelte-loader untuk webpack.

Jadi mari kita kaji semula pipeline kompilasi svelte,
Svelte menguraikan kod menjadi pohon sintaks abstrak, menganalisis kod, mancatat referensi dan pergantungan variabel. Kemudian svelte menghasilkan kod bergantung pada target kompilasi, sama ada untuk sisi browser atau sisi server.

Hasilan kompiler mengandungi JS dan CSS. Ia boleh ditulis ke dalam fail ataupun digunakan oleh bundler modul.

Terima kasih sudah mendengarkan. Jika anda ingin mempelajari lebih lanjut tentang svelte, ataupun mempunyai pertanyaan tentang svelte, anda boleh mengikuti saya di twitter. nama pengguna saya @lihautan. terima kasih