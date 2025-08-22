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