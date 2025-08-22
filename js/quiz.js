const GEMINI_API_KEY = "AIzaSyDicoKd6dv4ZQQqCXsvUkDyd0oiT4_t954";

var dict = {
    "原亘太郎": "愛する人のコミュニティ",
    "山口寛哉": "水曜日のダウンタウン",
    "住野京介": "ブラックコーヒー",
    "藤田峻也": "他人に応援される人間になること",
    "豊永和": "ルービックキューブ",
    "落合優椰": "運動、自然、一人の時間",
    "高橋誠": "自然の中で行うスポーツ",
    "白川善太郎": "アレグラ",
    "坂優樹": "コーヒー",
    "井上雄斗": "ねこ",
    "垣内志織": "電動自転車",
    "山口紗英": "友達や家族とおしゃべりする時間",
    "高野結衣子": "健康",
    "横山未侑": "旅行、ディズニーランド",
    "安達有沙": "ゴルフクラブと甘いもの",
    "小櫃優紀子": "家族と仲間",
    "請川文香": "散歩",
    "藤堂華子": "ワクワクするような経験や挑戦",
    "濱口未桜": "餅"
};


// ===== セレクトを埋める =====
function populateSelectBox() {
    var $select = $("#personSelect");
    if (!$select.length) return; // セレクトが無いページでは何もしない
    $select.empty().append('<option value="">-- 選択してください --</option>');
    Object.keys(dict).forEach(function (name) {
        $select.append('<option value="' + name + '">' + name + '</option>');
    });
}

// ===== 指定人物を表示 =====
function showPerson(personKey) {
    if (!dict[personKey]) return;
    $(".key").text(personKey).addClass("hide");
    $(".value").text("No " + dict[personKey] + " No Life");
    $("#gpt-opinion").text("---------------------");

    // ▼ セレクトを隠す
    $(".person-select").hide();
}

// ===== ランダム表示 =====
function selectRandomPerson() {
    var keys = Object.keys(dict);
    var randomIndex = Math.floor(Math.random() * keys.length);
    var randomKey = keys[randomIndex];
    var randomValue = dict[randomKey];
    $(".key").text(randomKey).addClass("hide");
    $(".value").text("No " + randomValue + " No Life");
    $("#gpt-opinion").text("---------------------");

    // ▼ ランダムの場合はセレクトを表示
    $(".person-select").show();
}

$(function () {
    populateSelectBox();

    // セレクト変更で人物を表示
    $(document).on("change", "#personSelect", function () {
        const selected = $(this).val();
        if (selected) showPerson(selected);
    });

    // 「次の方へ」でランダムに差し替え＋セレクト復活
    $("button.next").on("click", function () {
        $("#personSelect").val("");
        selectRandomPerson();
    });
});


// 初期表示：ランダム
// selectRandomPerson();

$(function () {
    populateSelectBox();

    // セレクト変更で人物を表示（.hide を外す）
    $(document).on("change", "#personSelect", function () {
        const selected = $(this).val();
        if (selected) showPerson(selected);
    });

    // 「次の問題へ」：ランダムに差し替え＋セレクトクリア
    $("button.next").on("click", function () {
        $("#personSelect").val("");
        selectRandomPerson();
    });
});

// Answer：.hide の付け替え（表示/非表示トグル）
$("button.answer").on("click", function () {
    // $(".key").toggleClass("hide");
    $(".key").removeClass("hide");
});

// 見解（Gemini）
$("button.opinion").on("click", function () {
    const motto = $(".value").text();
    $("#gpt-opinion").text("考え中…");

    $.ajax({
        url:
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
            GEMINI_API_KEY,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            text:
                                `前提として彼 or 彼女は壮絶な人生を送ってきた。彼・彼女の人生観に関してその人生観に至った背景の推測をその人になりきって答えてください（90〜120文字程度）：「No ${motto} No Life」`,
                        },
                    ],
                },
            ],
        }),
        timeout: 20000,
        beforeSend: function () {
            $("#gpt-opinion").text("考え中…");
        },
        success: function (data) {
            const opinion =
                data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
                "見解を取得できませんでした。";
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
        },
    });
});

$(function () {
    // 1) audio 要素を取得（無ければ動的生成）
    var audio = document.getElementById('opening-audio');
    if (!audio) {
        audio = document.createElement('audio');
        audio.id = 'opening-audio';
        audio.preload = 'auto';
        audio.setAttribute('playsinline', '');
        var src = document.createElement('source');
        src.src = './audio/opening.mp3';   // 実ファイルのパスに合わせて変更
        src.type = 'audio/mpeg';
        audio.appendChild(src);
        document.body.appendChild(audio);
    }

    var $shutter = $('.shutter');

    // 再生関数（確認UIなし）
    function tryPlay() {
        if (!audio) return;
        audio.currentTime = 0;
        audio.volume = 1;
        var p = audio.play();
        if (p && typeof p.catch === 'function') {
            // 自動再生ブロック時だけ、最初のユーザー操作で静かに再試行
            p.catch(function () {
                $(document).one('pointerdown keydown', tryPlay);
            });
        }
    }

    // フェードアウト停止
    function fadeOutAndPause() {
        if (!audio) return;
        var fade = setInterval(function () {
            audio.volume = Math.max(0, audio.volume - 0.1);
            if (audio.volume <= 0) {
                audio.pause();
                clearInterval(fade);
            }
        }, 100);
    }

    // 2) すでにアニメ開始済みでも鳴るよう、すぐ一度キック
    //    （ページロード直後で animationstart を取り逃がしても対処）
    requestAnimationFrame(tryPlay);

    // 3) .shutter のアニメ開始/終了にフック（各種ベンダープレフィックス対応）
    $shutter
        .on('animationstart webkitAnimationStart oAnimationStart MSAnimationStart', tryPlay)
        .on('animationend   webkitAnimationEnd   oAnimationEnd   MSAnimationEnd', fadeOutAndPause);
});