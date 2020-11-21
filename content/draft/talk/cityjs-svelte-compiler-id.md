Kerangka kerja web modern memungkinkan kami mendeskripsikan ** UI ** secara deklaratif, sebagai fungsi status, dari aplikasi.

Fungsi dapat ditulis dalam bentuk template, atau sintaks seperti template, yang menjelaskan dengan tepat bagaimana tampilan akan terlihat, di semua kemungkinan status.

Ketika keadaan berubah, tampilan juga harus berubah.

Kami tidak perlu menjelaskan bagaimana satu tampilan bertransisi ke tampilan lain. Kami tidak perlu menjelaskan elemen apa yang akan ditambahkan, dihapus atau dimodifikasi.

**Kerangka Web Modern melakukannya untuk kami.**

`framework_magic` mengambil 2 tampilan berikutnya dan mencari cara untuk beralih dari 1 tampilan ke tampilan lainnya.

kerangka kerja web modern seperti React dan Vue melakukannya dengan menggunakan teknik yang disebut DOM virtual.

Untuk menangani semua skenario yang mungkin, `framework_magic` ini bisa sangat besar dalam ukuran kode, dan tidak tergantung pada aplikasi yang didukungnya.

untuk react adalah 40kb gzip dan vue2 adalah 23kb gzip, vue3 adalah 10kb.

dan jika aplikasi Anda sederhana, itu bisa menjadi sangat kecil dalam hal ukuran kode relatif terhadap pustaka kerangka kerja, yang ditampilkan di bagian abu-abu pada bagan.

Namun, ini tidak harus menjadi, ** satu-satunya cara ** dalam melakukan sesuatu.

bagaimana jika kita bisa mengalihkan semua pekerjaan yang dilakukan di `framework_magic` dari waktu proses ke waktu pembuatan?

kita dapat menganalisis kode dan mencari tahu semua kemungkinan status dan tampilan, dan kemungkinan transisi di antara mereka, dan menghasilkan kode yang cukup untuk melakukan hal itu?
<! - yang mampu merender tampilan dan transisi di antara keduanya? ->

dan itulah ide inti Svelte.

compiler Svelte mengompilasi kode Svelte menjadi ** kode JavaScript yang dioptimalkan ** yang ** tumbuh secara linier ** bersama dengan kode aplikasi Anda.

dan hari ini kita akan melihat compiler Svelte.

Jangan khawatir jika Anda tidak terbiasa dengan Svelte / compiler, saya akan mencoba sebaik mungkin untuk menghindari jargon dan menjelaskan gambaran umum prosesnya.

---

Nama saya Tan Li Hau, saya seorang insinyur perangkat lunak di Shopee. Shopee adalah platform e-commerce di Asia Tenggara yang berbasis di Singapura.

Saya dibesarkan di kota yang indah bernama penang di malaysia, yang memiliki jajanan kaki lima terbaik di malaysia, seperti char koay teow, bihun goreng; rujak, salad buah eklektik dengan gula aren, kacang tanah dan saus cabai, dan jangan mulai saya dengan makanan. Semoga kalian bisa datang berkunjung ke Malaysia setelah pandemi virus corona ini selesai.

last but not least, im salah satu pengelola svelte

---

Sebelum kita mulai berbicara tentang kompiler, untuk kepentingan mereka yang belum memiliki kesempatan untuk melihat ke Svelte, mari kita lihat bagaimana komponen yang ramping terlihat.

sebuah komponen svelte ditulis dalam sebuah file dengan ekstensi `.svelte`. ^^ setiap file menjelaskan 1 komponen ^^ langsing.

^^ Anda dapat menambahkan 1 tag skrip ke komponen. ^^ tag skrip memungkinkan Anda untuk menentukan variabel, seperti yang Anda lakukan pada kode javascript apa pun, ^^ dan Anda dapat mereferensikan variabel dalam template html Anda, dengan "curly bracket".

^^ untuk menambahkan event listener, Anda menggunakan direktif `on:`, dan Anda dapat memperbarui variabel seperti ini, dan itu akan secara otomatis diperbarui di DOM Anda.

^^ Anda dapat menambahkan tag gaya dan menulis beberapa css untuk memberi gaya pada komponen Anda. Apa yang keren tentang itu || adalah bahwa css dibatasi dalam komponen. jadi saat saya bilang tombol, background: red, hanya tombol yang tertulis di file komponen ini yang backgroundnya merah. bukan komponen anak, bukan komponen induk. hanya komponen ini.

** sekarang **, berikut adalah salah satu fitur deklarasi ramping dan reaktif yang paling kuat, dan agak kontroversial.

di sini Anda memiliki double = count \ * 2, dengan tanda dolar + titik dua di depan pernyataan. ini berarti variabel `double` selalu 2 kali dari` count`, setiap kali nilai `count` berubah, nilai` double` juga akan diperbarui.

<! - dalam beberapa bahasa pemrograman, ini disebut operator takdir ->

Ini pasti terasa aneh pada awalnya, tetapi semakin sering Anda menggunakannya, Anda akan bertanya pada diri sendiri mengapa kita tidak memiliki ini sebelumnya.

Jadi, di sini kita punya 1 tombol merah besar, dan teks persamaan perkalian sebagai komponen Svelte.

Saya akan berhenti sejenak di sini, dan menanyakan pertanyaan ini, ** bagaimana Anda akan menerapkan ini, jika Anda tidak diizinkan menggunakan kerangka kerja apa pun dan Anda harus menulisnya dalam JavaScript Vanilla? **

(berhenti sebentar)

Jadi, pertama-tama kita akan mulai dengan deklarasi variabel.

Selanjutnya kita membuat teks dengan document.createTextNode, dan menyisipkannya ke induk

Selanjutnya kita buat tombol, ubah teks, tambahkan event listener dan masukkan ke induk.

Untuk memperbarui teks saat hitungan diperbarui, kami membuat fungsi pembaruan, di mana kami memperbarui nilai ganda dan memperbarui konten teks.

Terakhir untuk tag gaya, kami membuat tag gaya, mengatur konten dan memasukkan ke dalam head.

Untuk memastikan bahwa tombol tersebut hanya menargetkan tombol yang baru saja kita buat ini, kami menambahkan kelas ke tombol tersebut.

Di sini nama kelasnya acak, tetapi dapat dibuat berdasarkan hash kode gaya, sehingga Anda mendapatkan nama kelas yang konsisten.

(TODO: KLIK UNTUK MELIHAT OUTPUT JS)

Faktanya jika Anda melihat keluaran JS yang dihasilkan ramping, itu sangat mirip dengan kode yang baru saja kita tulis.

Jadi, ini hanyalah kode yang Anda butuhkan untuk ** membuat tombol dan teks **. Anda tidak memerlukan pustaka DOM Virtual 40KB untuk membuat ulang komponen yang sama.

Tentu saja, Anda tidak harus menulis semuanya sendiri.

Kompiler Svelte akan melakukannya untuk Anda. Ini akan menganalisis kode di atas, dan menghasilkan kode di bawah ini untuk Anda.

Dan sekarang, jika Anda mencoba memilih "SSR" sebagai output yang dihasilkan, Anda dapat melihat sekarang Svelte menghasilkan fungsi yang mengembalikan string yang dibuat menggunakan template literal.

Ini adalah beberapa perintah lebih berkinerja daripada menghasilkan objek pohon dan menserialisasinya menjadi string HTML.

(JANGAN PINDAH)

Jadi, mari kita ambil beberapa contoh sintaks Svelte lagi, dan selama ini, saya harap Anda bertanya pada diri sendiri pertanyaan ini, ** "bagaimana cara mengonversi / menulis ini dalam JavaScript biasa?" **

dan jangan khawatir, Anda dapat menemukan repl ini di situs web langsing. dan Anda dapat membandingkan input dan output js sesuai keinginan Anda.

(OKE SEKARANG PINDAH)
---

Untuk mengekspresikan logika dalam template, Svelte menyediakan blok logika, seperti ** `{#if}` **, ** `{#await}` **, dan ** `{#each}` **.

Untuk mengurangi kode boilerplate untuk mengikat variabel ke input, Svelte menyediakan direktif `bind:`.

Untuk memberikan transisi untuk elemen yang masuk atau keluar dari DOM, Svelte menyediakan direktif `transisi`,` masuk` dan `keluar`.

Untuk membuat Komponen, Svelte menyediakan slot dan templat yang mirip dengan API Komponen Web.

Ada banyak hal yang ingin saya bagikan di sini, tetapi saya harus beralih ke kompiler Svelte, karena itulah topik utama pembicaraan hari ini.

---

Sekarang, akhirnya, mari kita lihat compiler Svelte.

Jadi, bagaimana cara kerja kompilator?

Kompiler pertama membaca kode Anda, dan memecahnya menjadi bagian-bagian yang lebih kecil, yang disebut token.

Kompiler kemudian menelusuri daftar token ini dan menyusunnya ke dalam struktur pohon, sesuai dengan tata bahasa bahasanya. Struktur pohon inilah yang oleh compiler disebut "Pohon sintaks abstrak" atau disingkat AST.

AST adalah representasi pohon dari kode input.

Dan apa yang terkadang dilakukan kompilator, adalah menganalisis dan menerapkan transformasi ke AST.
Menggunakan algoritma penjelajahan pohon, seperti pencarian kedalaman pertama

Dan akhirnya, kompilator menghasilkan keluaran kode berdasarkan AST akhir.

Singkatnya, proses kompilasi umum melibatkan penguraian kode ke AST, melakukan analisis, pengoptimalan, atau transformasi pada AST, dan kemudian menghasilkan kode dari AST.
<! - Berikut adalah beberapa sumber daya di web, yang biasa saya pelajari tentang compiler. ->

---

Terakhir, mari kita lihat cara kerja Svelte compiler.

Svelte mem-parsing kode Svelte menjadi AST
Svelte kemudian menganalisis AST, yang akan kita bahas lebih lanjut nanti.
Dengan analisis, Svelte menghasilkan kode JavaScript tergantung pada target kompilasi, apakah itu untuk SSR atau untuk browser.
Terakhir, js dan css dibuat, dan dapat ditulis ke dalam file atau digunakan oleh proses build Anda.

---

Jadi mari kita mulai dari awal, parsing.

---

Berikut adalah komponen Svelte yang akan kita gunakan selama pembicaraan ini.

Svelte, || mengimplementasikan parsernya sendiri

Itu mengurai sintaks html…
... serta blok logika, seperti masing-masing, jika, dan menunggu

Karena js adalah bahasa yang cukup kompleks, setiap kali svelte bertemu || tag skrip, || atau tanda kurung kurawal, || itu akan menyerahkannya ke biji pohon ek, pengurai JavaScript ringan, untuk mengurai konten JS.
Hal yang sama juga terjadi dengan css. svelte menggunakan css-tree untuk mengurai konten CSS di antara tag gaya.

<! - Dalam komponen svelte, Anda hanya diperbolehkan memiliki 1 skrip modul, 1 skrip instance, dan 1 tag gaya di tingkat atas. ->

Jadi, melalui proses tersebut, kode svelte dipecah menjadi token, dan disusun menjadi Svelte AST.

Jika Anda tertarik untuk melihat bagaimana Svelte AST terlihat, Anda dapat memeriksanya di ASTExplorer.net.

Langkah selanjutnya adalah menganalisis AST.

Di sini, kode kita sudah dalam AST, || TAPI untuk membantu memvisualisasikan prosesnya, saya akan menunjukkan kepada Anda kode aslinya.

Hal pertama yang dilakukan Svelte || adalah melintasi skrip AST.

Setiap kali menemukan variabel, dalam hal ini, hitung, itu akan mencatat nama variabel.

di sini kami mencatat nilai || dan ganda.

"ganda" di sini, || dalam kode langsing ini || adalah variabel yang dideklarasikan reaktif. tetapi untuk vanilla JavaScript, kami memberikan nilai ke variabel ini "double", yang tidak dideklarasikan di mana pun.

dalam mode ketat, ini adalah kesalahan "penugasan ke variabel yang tidak dideklarasikan".

Svelte menandai variabel, "double", sebagai "disuntikkan", sehingga deklarasi variabel akan dimasukkan nanti. Contoh lain dari variabel yang diinjeksi adalah svelte magic global, seperti $$ props, atau $ prefix dari variabel store.

di sini kita menjumpai "hitungan" lagi, kali ini yang direferensikan, bukannya dikaitkan ke nilai, dan digunakan untuk menghitung nilai ganda. || jadi kita menggambar hubungan ketergantungan antara count dan double. || jadi ganda tergantung pada hitungan.

Ayo lanjutkan.

di sini kita melihat data. data tidak dideklarasikan pada cakupan level teratas, karena berada dalam cakupan blok kurung kurawal. jadi kami tidak akan merekamnya.

hal yang sama berlaku dengan `i`.

di sini kami menjumpai double lagi, jadi kami menandainya sebagai referensi.

Matematika, js global, kami akan mengabaikannya.

di sini `nilai` dimutasi.

sekarang kita mencapai akhir skrip, langkah selanjutnya adalah melintasi template AST.

kita mulai dari elemen `input`, yang memiliki` bind: value`.

Di sini kita mengikat nilai input ke variabel `count`. jadi kami menandai `hitungan` sebagai direferensikan dari template dan bermutasi.

Sekarang kami menemukan setiap blok. Di sini kita melakukan iterasi melalui variabel `nilai` dan kita menggunakan variabel` nilai` sebagai setiap item. Jadi template di dalam setiap blok || akan memiliki ruang lingkup baru, di mana `nilai` dideklarasikan. || Juga, kami menandai `nilai` sebagai ketergantungan dari setiap blok. || Ini berarti bahwa setiap kali `nilai` berubah, kami akan memperbarui setiap blok.


... dan, kami juga menandai nilai sebagai referensi.

selanjutnya, kita pindah ke setiap blok dan elemen div. Di sini kami menandai `nilai` sebagai direferensikan dari template, kami menemukan` nilai` lagi || dan kita telah mencapai akhir template.

dan Svelte menelusuri skrip lagi, kali ini terutama untuk pengoptimalan. || mencari tahu variabel mana yang tidak direferensikan, dan tidak perlu reaktif.

Demikian pula, jika ketergantungan deklarasi reaktif tidak akan pernah berubah, || dengan melihat apakah dependensinya ditandai sebagai bermutasi, || kita dapat menandainya sebagai statis, yang lebih efisien, dan ukurannya jauh lebih kecil.

Selanjutnya, Svelte melintasi gaya.

untuk setiap selektor, ini akan menentukan apakah itu akan cocok dengan elemen apapun dalam template, || dan jika ya, svelte akan menambahkan nama kelas hash svelte ke pemilih serta eelement yang cocok. || Meskipun ini akan meningkatkan spesifisitas selektor, namun ini akan membuat selektor hanya mencakup komponen langsing saat ini.

Di akhir langkah ini, Svelte telah menemukan semua variabel yang dideklarasikan, perilaku dan hubungannya.

Dengan ini, kita beralih ke fase rendering.

---

Langkah ini dimana svelte akan menghasilkan kode javascript.
Ada 2 target kompilasi yang berbeda, 1 adalah DOM, untuk sisi klien, dan yang lainnya adalah ssr, untuk sisi server.

Pertama-tama mari kita lihat target render dom.

Di sini kami memiliki kode sumber. dan berikut adalah garis besar tampilan keluaran dom.

Inilah yang saya sebut blok fragmen. fungsi create fragment mengembalikan sebuah objek, yang bertindak sebagai resep untuk membuat elemen dalam komponen. setiap metode dalam objek resep, mewakili sebuah tahapan dalam siklus hidup komponen, di sini kita memiliki `c` untuk` create`, `m` untuk` mounting`, `p` untuk` update`, dan `d` untuk` destroy` .

selanjutnya, kami memiliki fungsi instance. di sinilah logika state dan komponen masuk.

akhirnya kami memiliki kelas komponen langsing. jadi setiap komponen langsing dikompilasi menjadi kelas || yang merupakan ekspor default. dalam konstruktor, seperti yang Anda lihat, memanggil fungsi `init` || yang mengambil fungsi `instance` dan` create_fragment`. dan beginilah 3 bagian berbeda dari komponen langsing || datang bersama.

Sekarang, svelte berjalan melalui template lagi, dan mulai memasukkan kode ke dalam keluaran.

Pertama kita memiliki elemen input. kami memasukkan instruksi untuk membuat elemen input, || memasang elemen ke target, || dan hapus elemen dari target.

selanjutnya kita memiliki pengikatan nilai input ke variabel `count`. kita membutuhkan penangan masukan untuk mendengarkan perubahan masukan, sehingga kita dapat memperbarui nilai variabel `count`. || di sini kita menarik daftar variabel, dan menambahkan `input_handler`.

kami mengatur nilai input berdasarkan jumlah variabel || dan tambahkan pendengar acara untuk perubahan input || yang harus kita hapus pendengar acara saat kita menghancurkan komponen.

dan pada tahap update, jika `count` berubah, kita perlu mengupdate nilai input berdasarkan nilai` count`.

selanjutnya kita beralih ke setiap blok.

kami membuat blok fragmen baru untuk setiap blok, yang berisi resep untuk membuat elemen untuk 1 setiap item. Dan karena di setiap blok kita memiliki lingkup anak yang mendefinisikan variabel `nilai`, kita memiliki fungsi` get_each_context` untuk meniru itu.

Di sini kami mempercepat langkah-langkahnya, di mana untuk setiap elemen, kami memasukkan kode untuk cara kami membuat, memasang, memperbarui, dan menghancurkannya. Jika Anda tertarik untuk mengetahui detailnya, Anda bisa melihat blog seri saya yang berjudul "Compile Svelte in your head".

Sekarang kita melihat bagaimana Svelte mengisi fungsi instance. Dalam kebanyakan kasus, Svelte hanya menyalin apa pun yang tertulis di dalam tag `<script>`.

Untuk deklarasi reaktif, mereka ditambahkan di dalam fungsi `$$. Update`, || dan untuk setiap pernyataan, kami menambahkan pernyataan if untuk memeriksa apakah ketergantungannya telah berubah, berdasarkan hubungan ketergantungan yang telah kita gambar sebelumnya.

Sekarang kita perlu mendeklarasikan dan menambahkan variabel yang diinjeksi tersebut.

Terakhir, kami mengembalikan daftar variabel yang ** direferensikan oleh template ** saja.

Sekarang, untuk membuat variabel benar-benar reaktif, kami melengkapi `$$ invalidate` setelah setiap pernyataan penugasan, sehingga itu akan memulai putaran siklus pembaruan berikutnya.

Jadi di sini Anda memilikinya, keluaran kompilasi untuk target DOM.

Mari kita lihat sekilas bagaimana hal-hal yang terjadi untuk dikompilasi ke target SSR.

Struktur kode keluaran untuk target SSR jauh lebih sederhana. itu adalah fungsi yang mengembalikan string.

Karena tidak akan ada reaktivitas yang diperlukan di server, kita dapat menyalin kode secara verbatim dari tag skrip. || Hal yang sama berlaku untuk deklarasi reaktif, tentu saja kita perlu mengingat untuk mendeklarasikan variabel yang diinjeksi, `double`.

saat kita menelusuri template, kita menambahkan string atau ekspresi yang disisipkan ke literal template keluaran. Untuk setiap blok, kita mengulang melalui variabel `nilai` dan mengembalikan elemen anak sebagai string.

Dan begitulah, kode keluaran dari komponen langsing untuk SSR.

---

Terakhir, Svelte mengeluarkan kode dalam JS dan CSS, dengan kode sebagai string serta peta sumber.

Ini dapat ditulis ke dalam sistem file secara langsung, atau digunakan oleh bundler modul Anda, seperti rollup-svelte-plugin dalam rollup atau svelte-loader untuk webpack.

Jadi mari kita tinjau kembali pipeline kompilasi langsing,
Svelte mengurai kode menjadi ast, menjalankan serangkaian langkah untuk menganalisis kode, melacak referensi variabel dan dependensi. Kemudian svelte menghasilkan kode tergantung pada target kompilasi, apakah itu untuk sisi klien atau sisi server.
Dan hasil dari langkah render adalah JS dan CSS, yang dapat ditulis ke dalam file / digunakan oleh alat build Anda.

Terima kasih banyak sudah mendengarkan. Jika Anda ingin mempelajari lebih lanjut tentang svelte, atau jika Anda memiliki pertanyaan tentang svelte, Anda dapat mengikuti saya di twitter. Saya lihau. harap Anda bersenang-senang dengan ceramah selama konferensi. sampai jumpa.