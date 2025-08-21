const GEMINI_API_KEY = "AIzaSyDicoKd6dv4ZQQqCXsvUkDyd0oiT4_t954";

var dict = {
    "竹内優貴": "ありったけの夢と類まれな努力",
    "川中寛": "スポーツ",
    "高城楓": "言葉を尽くすこと",
    "篠塚祐貴": "高い目標を達成した時の快感",
    "住野京介": "ブラックコーヒー",
    // "山口紗英": "友達や家族とおしゃべりする時間",
    "上本晃平": "音楽",
    // "高野結子": "健康",
    // "横山未佑": "旅行、ディズニーランド",
    // "北原紫帆": "心の余裕",
    // "岡村怜南": "漫画（人生の参考書）",
    // "樋口葵": "おいしいご飯",
    "豊永和": "ルービックキューブ",
    "落合優椰": "運動、自然、一人の時間",
    "高橋誠": "自然の中で行うスポーツ",
    "松本雄大": "夢",
    // "趙嘉納": "環境の変化",
    "尼田優河": "花粉症の薬",
};

function selectRandomPerson() {
    var keys = Object.keys(dict);
    var randomIndex = Math.floor(Math.random() * keys.length);
    var randomKey = keys[randomIndex];
    var randomValue = dict[randomKey];
    $(".key").text(randomKey);
    $(".value").text("No " + randomValue + " No Life");
    $(".key").css("color", "black");
    $("#gpt-opinion").text("---------------------");
}

selectRandomPerson();

$("button.next").on("click", function () {
    selectRandomPerson();
});

$("button.answer").on("click", function () {
    $(".key").css("color", "white");
});

$("button.opinion").on("click", function () {
    const motto = $(".value").text();
    $("#gpt-opinion").text("考え中…");

    $.ajax({
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + GEMINI_API_KEY,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            contents: [
                {
                    parts: [
                        { text: `前提として彼 or 彼女は壮絶な人生を送ってきた。彼・彼女の人生観に関してその人生観に至った背景の推測をその人になりきって答えてください（90〜120文字程度）：「No ${motto} No Life」` }
                    ]
                }
            ]
        }),

        timeout: 20000,

        beforeSend: function () {
            $("#gpt-opinion").text("考え中…");
        },
        success: function (data) {
            const opinion = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
                || "見解を取得できませんでした。";
            $("#gpt-opinion").text(opinion);
        },
        error: function (xhr, status, error) {
            if (status === "timeout") {
                $("#gpt-opinion").text("タイムアウトしました。時間を置いて再実行してください。");
            } else if (status === "abort") {
                $("#gpt-opinion").text("リクエストが中断されました。");
            } else {
                console.error(error);
                $("#gpt-opinion").text("エラーが発生しました。");
            }
        }
    });

});
