/* 相性チェック 散布図 + 2点選択 + Gemini判定 + カメラ/画像アップロード（ポップアップ表示）
   X: logicalEmotional (100=論理的 / 0=感情的)
   Y: workPrivate      (100=仕事   / 0=プライベート)
*/
$(function () {
    // ====== 設定 ======
    const GEMINI_API_KEY = "AIzaSyDicoKd6dv4ZQQqCXsvUkDyd0oiT4_t954";
    const MODEL = "gemini-2.0-flash";

    // ====== データ ======
    const dictWithScores = {
        "竹内優貴": { value: "ありったけの夢と類まれな努力", logicalEmotional: 65, workPrivate: 65, gender: "male" },
        "川中寛": { value: "スポーツ", logicalEmotional: 45, workPrivate: 35, gender: "male" },
        "高城楓": { value: "言葉を尽くすこと", logicalEmotional: 80, workPrivate: 60, gender: "male" },
        "篠塚祐貴": { value: "高い目標を達成した時の快感", logicalEmotional: 40, workPrivate: 70, gender: "male" },
        "住野京介": { value: "ブラックコーヒー", logicalEmotional: 30, workPrivate: 55, gender: "male" },
        "上本晃平": { value: "音楽", logicalEmotional: 20, workPrivate: 30, gender: "male" },
        "豊永和": { value: "ルービックキューブ", logicalEmotional: 90, workPrivate: 40, gender: "male" },
        "落合優椰": { value: "運動、自然、一人の時間", logicalEmotional: 25, workPrivate: 20, gender: "male" },
        "高橋誠": { value: "自然の中で行うスポーツ", logicalEmotional: 35, workPrivate: 30, gender: "male" },
        "松本雄大": { value: "夢", logicalEmotional: 20, workPrivate: 45, gender: "male" },
        "尼田優河": { value: "花粉症の薬", logicalEmotional: 85, workPrivate: 60, gender: "female" }
    };

    const data = $.map(dictWithScores, (rec, name) => ({
        name,
        value: rec.value,
        x: rec.logicalEmotional,
        y: rec.workPrivate,
        gender: rec.gender || "male"
    }));

    // ====== SVG 基本設定 ======
    const width = 860;
    const height = 560;
    const margin = { top: 50, right: 60, bottom: 110, left: 90 }; // 下に選択UIを置く分広め
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const S = (tag, attrs = {}) => {
        const el = document.createElementNS(SVG_NS, tag);
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
        return $(el);
    };

    // ====== コンテナ & 補助UI（選択パネル/判定ボタン/モーダル） ======
    const $chart = $('<div id="chart"></div>').appendTo('body');

    // 選択パネル（カメラUIは filled 時に差し込み）
    const $panel = $(`
    <div class="pick-panel">
      <div class="slot" data-slot="0">
        <div class="slot-label">選択①</div>
        <div class="slot-main">
          <div class="slot-name">未選択</div>
          <div class="slot-value">—</div>
        </div>
      </div>
      <div class="slot" data-slot="1">
        <div class="slot-label">選択②</div>
        <div class="slot-main">
          <div class="slot-name">未選択</div>
          <div class="slot-value">—</div>
        </div>
      </div>
      <div class="actions">
        <button class="btn judge" disabled>相性を判定する</button>
        <button class="btn clear">選択をクリア</button>
      </div>
    </div>
  `).appendTo($chart);

    // モーダル（ポップアップ）
    const $modal = $(`
    <div class="modal" aria-hidden="true">
      <div class="modal__backdrop"></div>
      <div class="modal__dialog" role="dialog" aria-modal="true" aria-label="相性判定">
        <button class="modal__close" aria-label="閉じる">×</button>
        <h2 class="modal__title">相性判定</h2>
        <div class="modal__pair">
          <div class="p1"></div>
          <div class="sep">×</div>
          <div class="p2"></div>
        </div>
        <div class="modal__body">
          <div class="rank-line">相性ランク：<span class="rank-badge">—</span></div>
          <div class="dims">
            <div class="dim"><span class="dim-label">仕事面：</span><span class="dim-text"></span></div>
            <div class="dim"><span class="dim-label">友情面：</span><span class="dim-text"></span></div>
            <div class="dim"><span class="dim-label">恋愛面：</span><span class="dim-text"></span></div>
          </div>
        </div>
      </div>
    </div>
  `).appendTo('body');

    function openModal() { $modal.attr('aria-hidden', 'false').addClass('is-open'); }
    function closeModal() { $modal.attr('aria-hidden', 'true').removeClass('is-open'); }
    $modal.on('click', '.modal__backdrop, .modal__close', function () {
        // モーダルを閉じても映像プレビューはスロット内なのでそのまま
        closeModal();
    });

    // ====== SVG 本体 ======
    const $svg = S('svg', {
        class: 'chart-svg',
        xmlns: SVG_NS,
        viewBox: `0 0 ${width} ${height}`,
        width: width, height: height,
        role: 'img', 'aria-label': '価値観散布図'
    }).prependTo($chart);

    const $gGrid = S('g', { class: 'grid' }).appendTo($svg);
    const $gAxes = S('g', { class: 'axes' }).appendTo($svg);
    const $gPts = S('g', { class: 'points' }).appendTo($svg);

    // スケール
    const xPos = (v) => margin.left + (v / 100) * innerW;
    const yPos = (v) => margin.top + ((100 - v) / 100) * innerH;

    // グリッド & 目盛
    const ticks = [0, 25, 50, 75, 100];
    $.each(ticks, (_, t) => {
        const x = xPos(t);
        $gGrid.append(S('line', { class: 'grid-line v', x1: x, y1: margin.top, x2: x, y2: height - margin.bottom }));
        $gAxes.append(S('line', { class: 'tick v', x1: x, y1: height - margin.bottom, x2: x, y2: height - margin.bottom + 6 }));
        $gAxes.append(S('text', { class: 'tick-label v', x: x, y: height - margin.bottom + 20, 'text-anchor': 'middle' }).text(String(t)));
    });
    $.each(ticks, (_, t) => {
        const y = yPos(t);
        $gGrid.append(S('line', { class: 'grid-line h', x1: margin.left, y1: y, x2: width - margin.right, y2: y }));
        $gAxes.append(S('line', { class: 'tick h', x1: margin.left - 6, y1: y, x2: margin.left, y2: y }));
        $gAxes.append(S('text', { class: 'tick-label h', x: margin.left - 10, y: y + 4, 'text-anchor': 'end' }).text(String(t)));
    });

    // 軸
    $gAxes.append(S('line', { class: 'axis', x1: margin.left, y1: height - margin.bottom, x2: width - margin.right, y2: height - margin.bottom }));
    $gAxes.append(S('line', { class: 'axis', x1: margin.left, y1: margin.top, x2: margin.left, y2: height - margin.bottom }));

    // 軸ラベル
    $gAxes.append(S('text', { class: 'axis-end x-left', x: margin.left, y: height - margin.bottom + 40, 'text-anchor': 'start' }).text('感情的(0)'));
    $gAxes.append(S('text', { class: 'axis-end x-right', x: width - margin.right, y: height - margin.bottom + 40, 'text-anchor': 'end' }).text('論理的(100)'));
    $gAxes.append(S('text', { class: 'axis-title x', x: margin.left + innerW / 2, y: height - 20, 'text-anchor': 'middle' }).text('論理的 ←→ 感情的'));
    $gAxes.append(S('text', { class: 'axis-end y-top', x: margin.left - 55, y: margin.top + 6, 'text-anchor': 'end' }).text('仕事(100)'));
    $gAxes.append(S('text', { class: 'axis-end y-bottom', x: margin.left - 55, y: height - margin.bottom + 6, 'text-anchor': 'end' }).text('プライベート(0)'));
    $gAxes.append(S('text', {
        class: 'axis-title y',
        transform: `translate(${24}, ${margin.top + innerH / 2}) rotate(-90)`,
        'text-anchor': 'middle'
    }).text('仕事 ↑↓ プライベート'));

    // ====== 選択ロジック ======
    const selected = [];           // [{name,value,x,y,gender,photo?,$el?}, ...]
    const cameraStreams = {};      // { 0: MediaStream|null, 1: MediaStream|null }

    function stopCamera(slotIndex) {
        const stream = cameraStreams[slotIndex];
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            cameraStreams[slotIndex] = null;
        }
        const $slot = $panel.find(`.slot[data-slot="${slotIndex}"]`);
        $slot.find('video').each(function () {
            this.srcObject = null;
        });
        $slot.find('.cam-capture, .cam-stop').prop('disabled', true);
        $slot.find('.cam-start').prop('disabled', false);
    }

    function startCamera(slotIndex) {
        const $slot = $panel.find(`.slot[data-slot="${slotIndex}"]`);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            // カメラ非対応 → ファイル選択に誘導
            $slot.find('.file-input').trigger('click');
            return;
        }
        navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" }, audio: false
        }).then(stream => {
            cameraStreams[slotIndex] = stream;
            const video = $slot.find('video').get(0);
            video.srcObject = stream;
            video.play().catch(() => { });
            $slot.find('.cam-capture, .cam-stop').prop('disabled', false);
            $slot.find('.cam-start').prop('disabled', true);
        }).catch(err => {
            console.warn('getUserMedia error:', err);
            // 失敗したらファイル選択へ
            $slot.find('.file-input').trigger('click');
        });
    }

    function capturePhoto(slotIndex) {
        const $slot = $panel.find(`.slot[data-slot="${slotIndex}"]`);
        const video = $slot.find('video').get(0);
        if (!video || !video.videoWidth) { return; }

        const canvas = $slot.find('canvas').get(0);
        const w = video.videoWidth;
        const h = video.videoHeight;
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

        setThumb(slotIndex, dataUrl);
    }

    function setThumb(slotIndex, dataUrl) {
        const $slot = $panel.find(`.slot[data-slot="${slotIndex}"]`);
        $slot.find('.thumb img').attr('src', dataUrl).attr('aria-hidden', 'false').show();

        // 選択配列の該当要素に保存（スロットと同じ添字）
        if (selected[slotIndex]) {
            selected[slotIndex].photo = dataUrl;
        }
    }

    function ensureMediaUI(slotIndex, item) {
        const $slot = $panel.find(`.slot[data-slot="${slotIndex}"]`);
        const hasUI = $slot.find('.slot-media').length > 0;

        if (!item) {
            // 未選択ならUIを消してカメラ停止
            stopCamera(slotIndex);
            if (hasUI) $slot.find('.slot-media').remove();
            return;
        }
        if (!hasUI) {
            // カメラUIを生成
            $slot.find('.slot-main').append(`
        <div class="slot-media" data-slot-media="${slotIndex}">
          <div class="cam">
            <video autoplay playsinline muted></video>
            <canvas style="display:none"></canvas>
          </div>
          <div class="cam-actions">
            <button type="button" class="btn cam-start">カメラ起動</button>
            <button type="button" class="btn cam-capture" disabled>撮影</button>
            <label class="btn file-label">
              画像を選択
              <input type="file" accept="image/*" class="file-input" hidden>
            </label>
            <button type="button" class="btn cam-stop" disabled>停止</button>
          </div>
          <div class="thumb"><img alt="プレビュー" style="display:none"/></div>
        </div>
      `);
        }
        // 以前に撮った写真があれば反映
        if (item.photo) {
            setThumb(slotIndex, item.photo);
        }
    }

    function updatePanel() {
        // スロットに selected[0], selected[1] を差し込み
        for (let i = 0; i < 2; i++) {
            const item = selected[i];
            const $slot = $panel.find(`.slot[data-slot="${i}"]`);
            if (item) {
                $slot.addClass('filled');
                $slot.find('.slot-name').text(item.name);
                $slot.find('.slot-value').text(`「${item.value}」 / 論理:${item.x}・仕事:${item.y}`);
            } else {
                $slot.removeClass('filled');
                $slot.find('.slot-name').text('未選択');
                $slot.find('.slot-value').text('—');
            }
            ensureMediaUI(i, item);
        }
        // ボタン制御
        $panel.find('.btn.judge').prop('disabled', selected.length !== 2);
    }

    function toggleSelect(d, $circle) {
        const idx = selected.findIndex(s => s.name === d.name);
        if (idx >= 0) {
            selected[idx].$el.removeClass('is-selected').attr('r', 7);
            selected.splice(idx, 1);
            updatePanel();
            return;
        }
        if (selected.length === 2) {
            const removed = selected.shift();
            if (removed && removed.$el) removed.$el.removeClass('is-selected').attr('r', 7);
        }
        $circle.addClass('is-selected').attr('r', 9);
        selected.push({ ...d, $el: $circle, photo: null });
        updatePanel();
    }

    $panel.on('click', '.btn.clear', function () {
        while (selected.length) {
            const s = selected.pop();
            s.$el && s.$el.removeClass('is-selected').attr('r', 7);
        }
        // 両スロットのカメラ停止
        stopCamera(0); stopCamera(1);
        updatePanel();
    });

    // ====== ツールチップ ======
    const $tooltip = $('<div class="tooltip" role="dialog" aria-live="polite"></div>').appendTo('body').hide();
    const showTooltip = (html, pageX, pageY) => {
        $tooltip.html(html).show();
        const offset = 14;
        const tw = $tooltip.outerWidth();
        const th = $tooltip.outerHeight();
        let left = pageX + offset;
        let top = pageY + offset;
        const vw = $(window).width();
        const vh = $(window).height();
        if (left + tw > vw - 8) left = pageX - tw - offset;
        if (top + th > vh - 8) top = pageY - th - offset;
        $tooltip.css({ left, top });
    };
    const hideTooltip = () => $tooltip.hide();

    // ====== 点を描画（genderで色分け） ======
    $.each(data, function (_, d) {
        const cx = xPos(d.x);
        const cy = yPos(d.y);
        const genderClass = (d.gender === 'female') ? 'female' : 'male';

        const $pt = S('circle', {
            class: `point ${genderClass}`,
            cx: cx, cy: cy, r: 7,
            'data-name': d.name,
            'data-value': d.value,
            'data-x': d.x,
            'data-y': d.y,
            'data-gender': d.gender
        }).appendTo($gPts);

        $pt.on('click', function (e) {
            e.stopPropagation();
            toggleSelect(d, $(this));
        });

        $pt.on('mouseenter', function (e) {
            $(this).addClass('is-hover');
            const html = `
        <div class="tt-name">${d.name} (${d.gender === 'female' ? '女性' : '男性'})</div>
        <div class="tt-value">「${d.value}」</div>
        <div class="tt-scores">論理的-感情的: <b>${d.x}</b> ／ 仕事-プライベート: <b>${d.y}</b></div>`;
            showTooltip(html, e.pageX, e.pageY);
        }).on('mousemove', function (e) {
            showTooltip($tooltip.html(), e.pageX, e.pageY);
        }).on('mouseleave', function () {
            $(this).removeClass('is-hover');
            hideTooltip();
        });
    });

    // ====== カメラUIのイベント（委譲） ======
    $panel.on('click', '.cam-start', function () {
        const slotIndex = Number($(this).closest('.slot').data('slot'));
        startCamera(slotIndex);
    });
    $panel.on('click', '.cam-capture', function () {
        const slotIndex = Number($(this).closest('.slot').data('slot'));
        capturePhoto(slotIndex);
    });
    $panel.on('click', '.cam-stop', function () {
        const slotIndex = Number($(this).closest('.slot').data('slot'));
        stopCamera(slotIndex);
    });
    $panel.on('change', '.file-input', function (e) {
        const slotIndex = Number($(this).closest('.slot').data('slot'));
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
            const dataUrl = ev.target.result;
            setThumb(slotIndex, dataUrl);
        };
        reader.readAsDataURL(file);
    });

    // ====== Gemini への問い合わせ ======
    function buildPrompt(p1, p2) {
        return [
            `あなたは価値観の相性診断の専門家です。`,
            `次の2人の「No ○○ No Life」の ○○ と、数値スコア（論理的-感情的, 仕事-プライベート）を踏まえ、相性を日本語で判定してください。`,
            `出力は必ず次のJSONのみで返してください：`,
            `{"rank":"S|A|B|C|D","work":"100字","friendship":"100字","love":"100字"}`,
            `制約：句読点以外の記号は使わない。`,
            ``,
            `人物1: ${p1.name} / 「${p1.value}」 / 論理:${p1.x} / 仕事:${p1.y}`,
            `人物2: ${p2.name} / 「${p2.value}」 / 論理:${p2.x} / 仕事:${p2.y}`
        ].join('\n');
    }

    function safeParseGeminiText(txt) {
        if (!txt) return null;
        const m = txt.match(/\{[\s\S]*\}/);
        const core = m ? m[0] : txt;
        try { return JSON.parse(core); } catch (e) { return null; }
    }

    function personHTML(p) {
        const bgStyle = p.photo ? `style="background-image:url('${p.photo}');"` : '';
        const alt = `${p.name}の写真`;
        return `
      <div class="person">
        <div class="avatar ${p.photo ? 'has-photo' : ''}" ${bgStyle} role="img" aria-label="${alt}"></div>
        <div class="person-text">${p.name}：「${p.value}」</div>
      </div>`;
    }

    function showResultModal(p1, p2, result) {
        // ペア（アバター込み）
        $modal.find('.p1').html(personHTML(p1));
        $modal.find('.p2').html(personHTML(p2));

        // ランクと文
        const rank = (result && result.rank || '—').toUpperCase();
        const work = result && result.work || '—';
        const friendship = result && result.friendship || '—';
        const love = result && result.love || '—';

        const $badge = $modal.find('.rank-badge').text(rank).removeClass('rS rA rB rC rD');
        if (/^[SABCD]$/.test(rank)) $badge.addClass(`r${rank}`);

        const $dims = $modal.find('.dims');
        $dims.find('.dim').eq(0).find('.dim-text').text(work);
        $dims.find('.dim').eq(1).find('.dim-text').text(friendship);
        $dims.find('.dim').eq(2).find('.dim-text').text(love);

        openModal();
    }

    function judgeCompatibility() {
        if (selected.length !== 2) return;
        const [p1, p2] = selected;
        const $btn = $panel.find('.btn.judge').prop('disabled', true).addClass('loading').text('判定中…');
        const prompt = buildPrompt(p1, p2);

        $.ajax({
            url: `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=` + encodeURIComponent(GEMINI_API_KEY),
            method: "POST",
            timeout: 15000,
            contentType: "application/json",
            data: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }).done(function (data) {
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const parsed = safeParseGeminiText(text);
            showResultModal(p1, p2, parsed || null);
        }).fail(function (xhr, status, error) {
            console.error(error);
            showResultModal(p1, p2, { rank: '—', work: '取得に失敗しました', friendship: '取得に失敗しました', love: '取得に失敗しました' });
        }).always(function () {
            $btn.prop('disabled', selected.length !== 2).removeClass('loading').text('相性を判定する');
        });
    }

    $panel.on('click', '.btn.judge', judgeCompatibility);

    // 初期描画
    updatePanel();

    // ページ離脱時にカメラを止める
    $(window).on('beforeunload', function () {
        stopCamera(0); stopCamera(1);
    });
});
