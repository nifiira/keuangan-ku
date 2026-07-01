 
      import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
      import {
        getAuth,
        signInWithPopup,
        GoogleAuthProvider,
        signOut,
        onAuthStateChanged,
      } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
      import {
        getFirestore,
        collection,
        addDoc,
        query,
        where,
        onSnapshot,
        orderBy,
      } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

      const firebaseConfig = {
        apiKey: "AIzaSyA5SmScxfhRunQW5_dU4QyhyGvKe3Pp5yc",
        authDomain: "keuangan-ku-a0a62.firebaseapp.com",
        projectId: "keuangan-ku-a0a62",
        storageBucket: "keuangan-ku-a0a62.firebasestorage.app",
        messagingSenderId: "400209904843",
        appId: "1:400209904843:web:21479af3c02ec5992fc74e",
        measurementId: "G-84K28W52EP",
      };

      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const db = getFirestore(app);

      let currentUser = null;
      let dataSnapshotGlobal = null; // Menyimpan data snapshot secara global untuk kebutuhan filter otomatis

      const loginBtn = document.getElementById("loginBtn");
      const logoutBtn = document.getElementById("logoutBtn");
      const appContent = document.getElementById("app-content");
      const summarySection = document.getElementById("summary-section");
      const filterSection = document.getElementById("filter-section");
      const userInfo = document.getElementById("userInfo");

      // Filter Inputs
      const filterType = document.getElementById("filter-type");
      const filterDate = document.getElementById("filter-date");
      const filterMonth = document.getElementById("filter-month");

      loginBtn.addEventListener("click", () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).catch((error) =>
          console.error("Login Error:", error),
        );
      });

      logoutBtn.addEventListener("click", () => {
        signOut(auth).catch((error) => console.error("Logout Error:", error));
      });

      onAuthStateChanged(auth, (user) => {
        if (user) {
          currentUser = user;
          loginBtn.style.display = "none";
          logoutBtn.style.display = "inline-block";
          appContent.style.display = "grid";
          summarySection.style.display = "grid";
          filterSection.style.display = "flex"; // Tampilkan filter
          userInfo.textContent = `Halo, ${user.displayName} | `;
          muatData();
        } else {
          currentUser = null;
          loginBtn.style.display = "inline-block";
          logoutBtn.style.display = "none";
          appContent.style.display = "none";
          summarySection.style.display = "none";
          filterSection.style.display = "none"; // Sembunyikan filter
          userInfo.textContent = "";
        }
      });

      // Event Listeners Kontrol Filter
      filterType.addEventListener("change", () => {
        if (filterType.value === "semua") {
          filterDate.style.display = "none";
          filterMonth.style.display = "none";
        } else if (filterType.value === "harian") {
          filterDate.style.display = "inline-block";
          filterMonth.style.display = "none";
        } else if (filterType.value === "bulanan") {
          filterDate.style.display = "none";
          filterMonth.style.display = "inline-block";
        }
        prosesDanTampilkanData(); // Hitung ulang data saat tipe filter diganti
      });

      filterDate.addEventListener("change", prosesDanTampilkanData);
      filterMonth.addEventListener("change", prosesDanTampilkanData);

      window.tambahData = async function (tipe) {
        if (!currentUser) return alert("Silakan login dulu!");

        const dateInput = document.getElementById(`date-${tipe}`).value;
        const nomInput = document.getElementById(`nom-${tipe}`).value;
        const ketInput = document.getElementById(`ket-${tipe}`).value;
        const katElement = document.getElementById(`kat-${tipe}`);
        const katInput = katElement ? katElement.value : "-";

        if (!dateInput || !nomInput || !ketInput)
          return alert("Harap isi semua kolom!");

        try {
          await addDoc(collection(db, "transaksi"), {
            uid: currentUser.uid,
            tipe: tipe,
            tanggal: dateInput,
            nominal: parseInt(nomInput),
            uraian: ketInput,
            kategori: katInput,
            timestamp: new Date(),
          });
          document.getElementById(`nom-${tipe}`).value = "";
          document.getElementById(`ket-${tipe}`).value = "";
        } catch (e) {
          console.error("Error adding document: ", e);
        }
      };

      function formatRupiah(angka) {
        return new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
        }).format(angka);
      }

      function muatData() {
        if (!currentUser) return;

        const q = query(
          collection(db, "transaksi"),
          where("uid", "==", currentUser.uid),
          orderBy("timestamp", "asc"),
        );

        onSnapshot(q, (snapshot) => {
          dataSnapshotGlobal = snapshot; // Simpan snapshot data ke variabel global
          prosesDanTampilkanData(); // Proses penampilan data
        });
      }

      // FUNGSI UTAMA UNTUK FILTER DATA & TOTALS secara Real-time
      function prosesDanTampilkanData() {
        if (!dataSnapshotGlobal) return;

        const dataPendapatan = document.getElementById("table-pendapatan");
        const dataPengeluaran = document.getElementById("table-pengeluaran");
        const dataRencana = document.getElementById("table-rencana");

        dataPendapatan.innerHTML = "";
        dataPengeluaran.innerHTML = "";
        dataRencana.innerHTML = "";

        let totalPendapatan = 0;
        let totalPengeluaran = 0;
        let totalRencana = 0;

        const tipeFilter = filterType.value;
        const nilaiTanggal = filterDate.value; // Format: YYYY-MM-DD
        const nilaiBulan = filterMonth.value; // Format: YYYY-MM

        dataSnapshotGlobal.forEach((doc) => {
          const dt = doc.data();

          // --- LOGIKA PENYARINGAN (FILTERING) ---
          if (
            tipeFilter === "harian" &&
            nilaiTanggal &&
            dt.tanggal !== nilaiTanggal
          ) {
            return; // Lewati baris data ini jika tidak sesuai tanggal filter harian
          }
          if (
            tipeFilter === "bulanan" &&
            nilaiBulan &&
            !dt.tanggal.startsWith(nilaiBulan)
          ) {
            return; // Lewati baris data ini jika tidak sesuai bulan filter bulanan (pencocokan YYYY-MM)
          }

          const row = `<tr>
                      <td>${dt.tanggal}</td>
                      <td>${formatRupiah(dt.nominal)}</td>
                      <td>${dt.uraian}</td>
                      ${dt.tipe !== "rencana" ? `<td>${dt.kategori}</td>` : ""}
                  </tr>`;

          if (dt.tipe === "pendapatan") {
            dataPendapatan.innerHTML += row;
            totalPendapatan += dt.nominal;
          } else if (dt.tipe === "pengeluaran") {
            dataPengeluaran.innerHTML += row;
            totalPengeluaran += dt.nominal;
          } else if (dt.tipe === "rencana") {
            dataRencana.innerHTML += row;
            totalRencana += dt.nominal;
          }
        });

        // Hitung Sisa Saldo terfilter
        const sisaPengeluaran = totalPendapatan - totalPengeluaran;
        const sisaRencana = totalPendapatan - totalRencana;

        // Update UI Ringkasan secara Dinamis
        document.getElementById("tot-pendapatan").textContent =
          formatRupiah(totalPendapatan);
        document.getElementById("tot-pengeluaran").textContent =
          formatRupiah(totalPengeluaran);
        document.getElementById("tot-rencana").textContent =
          formatRupiah(totalRencana);

        document.getElementById("tot-sisa-pengeluaran").textContent =
          formatRupiah(sisaPengeluaran);
        document.getElementById("tot-sisa-rencana").textContent =
          formatRupiah(sisaRencana);
      }
    