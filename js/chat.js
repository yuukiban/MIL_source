// jQuery × Firebase Realtime Database Chat
$(function () {
    // ===== Firebase 初期化 =====
    const firebaseConfig = {
        databaseURL: "https://millight-628c9-default-rtdb.firebaseio.com/"
        // 認証を使う/Hosting等も使うなら apiKey など他キーも追加OK
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // // （任意）匿名認証を使う場合は有効に
    // firebase.auth().signInAnonymously().catch(console.error);

    // ===== 参照パス =====
    const MESSAGES_PATH = "/rooms/global/messages";
    const messagesRef = db.ref(MESSAGES_PATH);

    // ===== DOM 参照 =====
    const $messages = $("#messages");
    const $form = $("#chat-form");
    const $name = $("#name");
    const $text = $("#text");
    const $err = $("#err");

    // ===== 受信（最新100件） =====
    messagesRef.orderByChild("ts").limitToLast(100).on("child_added", (snap) => {
        const msg = snap.val() || {};
        appendMessage(msg.name, msg.text, msg.ts);
        scrollToBottom();
    });

    // ===== 送信（Enterで送信 / Shift+Enterで改行）=====
    $form.on("keydown", "#text", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            $form.trigger("submit");
        }
    });

    $form.on("submit", async function (e) {
        e.preventDefault();
        $err.prop("hidden", true).text("");

        const name = ($name.val() || "").toString().trim().slice(0, 24) || "名無し";
        const text = ($text.val() || "").toString().trim();
        if (!text) return;

        const payload = {
            name,
            text,
            ts: firebase.database.ServerValue.TIMESTAMP
        };

        try {
            await messagesRef.push(payload);
            $text.val("").trigger("focus");
        } catch (err) {
            $err.text("送信に失敗しました: " + (err?.message || err)).prop("hidden", false);
        }
    });

    // ===== 表示系 =====
    function appendMessage(name, text, ts) {
        const esc = (s) =>
            String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
        const time = ts ? new Date(ts).toLocaleString("ja-JP") : "";

        const $item = $(`
      <div class="msg">
        <div>
          <div class="msg__name">${esc(name)}</div>
          <div class="msg__text">${esc(text)}</div>
        </div>
        <div class="msg__meta">${esc(time)}</div>
      </div>
    `);
        $messages.append($item);
    }

    function scrollToBottom() {
        $messages.stop(true).animate({ scrollTop: $messages[0].scrollHeight }, 200);
    }
});
