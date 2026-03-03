// ============================================================
// UI_modal.js — 通用弹窗/蒙层组件 (UI文件夹/shared)
// 模拟易次元的 callUI / removeCurrentUI 交互模式
// 在demo环境中使用DOM实现
// ============================================================

/**
 * 显示模态弹窗（模拟 ac.callUI 的阻塞式交互）
 * @param {Object} options
 * @param {string} options.title - 弹窗标题
 * @param {string} options.content - 弹窗HTML内容
 * @param {Array} options.buttons - [{ text, onClick, className }]
 * @returns {Promise} resolve时弹窗已关闭
 */
function UI_showModal(options) {
    return new Promise(function (resolve) {
        var overlay = document.createElement('div');
        overlay.className = 'ui-modal-overlay';
        overlay.innerHTML =
            '<div class="ui-modal-box">' +
                '<div class="ui-modal-title">' + (options.title || '') + '</div>' +
                '<div class="ui-modal-content">' + (options.content || '') + '</div>' +
                '<div class="ui-modal-buttons"></div>' +
            '</div>';

        var btnContainer = overlay.querySelector('.ui-modal-buttons');
        var buttons = options.buttons || [{ text: '确定' }];

        buttons.forEach(function (btn) {
            var el = document.createElement('button');
            el.className = 'ui-modal-btn ' + (btn.className || '');
            el.textContent = btn.text;
            el.onclick = function () {
                overlay.remove();
                if (btn.onClick) btn.onClick();
                resolve(btn.text);
            };
            btnContainer.appendChild(el);
        });

        document.body.appendChild(overlay);
    });
}

/**
 * 关闭当前弹窗（模拟 ac.removeCurrentUI）
 */
function UI_removeCurrentModal() {
    var overlay = document.querySelector('.ui-modal-overlay');
    if (overlay) overlay.remove();
}
