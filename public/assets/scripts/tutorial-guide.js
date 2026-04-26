window.TutorialGuide = {
  create({ title, steps = [], onBack = null } = {}){
    let current = 0;
    const root = document.createElement('aside');
    root.className = 'tutorial-guide';
    root.innerHTML = `
      <div class="tutorial-guide-head">
        <span>Interactive Tutorial</span>
        <strong></strong>
      </div>
      <div class="tutorial-guide-progress"><i></i></div>
      <p class="tutorial-guide-body"></p>
      <ul class="tutorial-guide-tips"></ul>
      <div class="tutorial-guide-actions">
        <button type="button" data-guide-back>Back to lobby</button>
        <button type="button" data-guide-next>Next tip</button>
      </div>
    `;
    document.body.appendChild(root);

    const titleEl = root.querySelector('strong');
    const bodyEl = root.querySelector('.tutorial-guide-body');
    const tipsEl = root.querySelector('.tutorial-guide-tips');
    const progressEl = root.querySelector('.tutorial-guide-progress i');
    const nextBtn = root.querySelector('[data-guide-next]');
    const backBtn = root.querySelector('[data-guide-back]');

    function render(){
      const step = steps[current] || {};
      titleEl.textContent = step.title || title || 'Tutorial';
      bodyEl.textContent = step.body || '';
      tipsEl.innerHTML = (step.tips || []).map(tip => `<li>${escapeHtml(tip)}</li>`).join('');
      progressEl.style.width = `${steps.length ? ((current + 1) / steps.length) * 100 : 100}%`;
      nextBtn.textContent = current >= steps.length - 1 ? 'Repeat tips' : 'Next tip';
    }

    function escapeHtml(text){
      return String(text || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    nextBtn.addEventListener('click', () => {
      current = steps.length ? (current + 1) % steps.length : 0;
      render();
    });

    backBtn.addEventListener('click', () => {
      if(typeof onBack === 'function') onBack();
      else window.history.back();
    });

    render();

    return {
      root,
      setStep(index){
        current = Math.max(0, Math.min(steps.length - 1, index));
        render();
      },
      message(body, tips = []){
        titleEl.textContent = title || 'Tutorial';
        bodyEl.textContent = body;
        tipsEl.innerHTML = tips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('');
      },
      complete(body = 'Tutorial complete. You are ready for a real match.'){
        root.classList.add('is-complete');
        titleEl.textContent = 'Tutorial complete';
        bodyEl.textContent = body;
        progressEl.style.width = '100%';
      }
    };
  }
};
