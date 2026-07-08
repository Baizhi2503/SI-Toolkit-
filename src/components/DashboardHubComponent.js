const { StorageController } = require('../models');

function checkAndDissolveGroup(app, parentIdx, isArchive = false) {
    const listTarget = isArchive ? app.db.finalizedCases : app.db.activeCases;
    const group = listTarget[parentIdx];

    if (group && group.cases.length < 2) {
        if (group.cases.length === 1) {
            const lastCase = group.cases[0];
            
            if (isArchive) {
                lastCase.isFinalized = true;
            }
            
            listTarget.push(lastCase);
        }
        listTarget.splice(parentIdx, 1);
        return true;
    }
    return false;
}

function buildDynamicGroupContainerCard(groupObj, groupIndex, buildCardFn) {
    const container = document.createElement('div');
    container.className = 'case-group-wrapper';
    container.id = groupObj.id;
    container.style.cssText = `
        border: 2px solid var(--theme-accent);
        background: #111116;
        border-radius: 8px;
        margin-bottom: 15px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 4px 15px var(--theme-glow);
    `;

    container.innerHTML = `
        <div class="group-header" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; background: #161622; border-bottom: 1px solid #2a2a38; user-select: none;">
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <button class="toggle-group-btn" style="background: transparent; border: none; color: var(--theme-accent); cursor: pointer; font-size: 14px; padding: 0;">▼</button>
                <span class="group-editable-title" contenteditable="true" style="color: #70a1ff; font-weight: bold; font-family: monospace; font-size: 14px; border-bottom: 1px dashed rgba(112, 161, 255, 0.4); padding-bottom: 2px; cursor: text;">
                    ${groupObj.title}
                </span>
            </div>
            <div style="background: var(--theme-glow); color: var(--theme-accent); border: 1px solid var(--theme-border); padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; font-family: monospace;">
                ${groupObj.cases.length} Cases Linked
            </div>
        </div>
        <div class="group-cases-body" style="display: flex; flex-direction: column; gap: 10px; padding: 15px; background: #0c0c10;"></div>
    `;

    const bodyContainer = container.querySelector('.group-cases-body');
    const toggleBtn = container.querySelector('.toggle-group-btn');
    const titleSpan = container.querySelector('.group-editable-title');

    const isParentGroupArchived = !!groupObj.isFinalized;

    groupObj.cases.forEach(childCase => {
        const cardElement = buildCardFn(childCase, isParentGroupArchived, true); 
        
        cardElement.setAttribute('draggable', 'true');
        cardElement.addEventListener('dragstart', (e) => {
            e.stopPropagation(); 
            e.dataTransfer.setData('text/plain', childCase.ticketId);
            e.dataTransfer.setData('source-parent-group', groupObj.id);
            cardElement.style.opacity = '0.4';
        });
        cardElement.addEventListener('dragend', () => {
            cardElement.style.opacity = '1';
        });

        bodyContainer.appendChild(cardElement);
    });

    toggleBtn.onclick = () => {
        const isHidden = bodyContainer.style.display === 'none';
        bodyContainer.style.display = isHidden ? 'flex' : 'none';
        toggleBtn.textContent = isHidden ? '▼' : '▶';
    };

    titleSpan.onblur = () => {
        const newTitle = titleSpan.textContent.trim();
        if (newTitle) {
            const listTarget = isParentGroupArchived ? window.app.db.finalizedCases : window.app.db.activeCases;
            if (listTarget[groupIndex]) listTarget[groupIndex].title = newTitle;
            StorageController.save(window.app.db);
        }
    };

    container.addEventListener('dragover', (e) => e.preventDefault());
    container.addEventListener('drop', (e) => {  
        e.preventDefault();
        e.stopPropagation(); 
        const { app, renderPortalDashboardHub } = window;
        const draggedTicketId = e.dataTransfer.getData('text/plain');
        const sourceGroupId = e.dataTransfer.getData('source-parent-group');
        
        if (!draggedTicketId || draggedTicketId.startsWith('group-') || !app || !app.db || isParentGroupArchived) return;

        if (sourceGroupId === groupObj.id) return;

        let caseObj = null;

        if (sourceGroupId) {
            const srcGroupIdx = app.db.activeCases.findIndex(g => g.id === sourceGroupId);
            if (srcGroupIdx !== -1) {
                const srcGroup = app.db.activeCases[srcGroupIdx];
                const caseIdx = srcGroup.cases.findIndex(c => c.ticketId === draggedTicketId);
                if (caseIdx !== -1) {
                    caseObj = srcGroup.cases.splice(caseIdx, 1)[0];
                    checkAndDissolveGroup(app, srcGroupIdx, false);
                }
            }
        } else {
            const caseIndex = app.db.activeCases.findIndex(c => c.ticketId === draggedTicketId);
            if (caseIndex > -1) {
                caseObj = app.db.activeCases.splice(caseIndex, 1)[0];
            }
        }

        if (caseObj) {
            const currentParentIdx = app.db.activeCases.findIndex(g => g.id === groupObj.id);
            if (currentParentIdx !== -1) {
                app.db.activeCases[currentParentIdx].cases.push(caseObj);
            }
            StorageController.save(app.db);
            if (typeof renderPortalDashboardHub === 'function') renderPortalDashboardHub();
        }
    });
    return container;
}

function attachCardGroupingDragListeners(cardElement, ticketId) {
    cardElement.setAttribute('draggable', 'true');
    
    cardElement.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', ticketId);
        cardElement.style.opacity = '0.4';
    });

    cardElement.addEventListener('dragend', () => {
        cardElement.style.opacity = '1';
        cardElement.style.border = '1px solid var(--border)';
    });

    cardElement.addEventListener('dragover', (e) => {
        e.preventDefault();
        cardElement.style.border = '2px dashed var(--theme-accent)'; 
    });

    cardElement.addEventListener('dragleave', () => {
        cardElement.style.border = '1px solid var(--border)';
    });

    cardElement.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const { app, renderPortalDashboardHub } = window;
        const draggedId = e.dataTransfer.getData('text/plain');
        const sourceGroupId = e.dataTransfer.getData('source-parent-group');
        
        if (!draggedId || draggedId === ticketId || draggedId.startsWith('group-') || !app || !app.db) {
            cardElement.style.border = '1px solid var(--border)';
            return;
        }

        let srcCase = null;

        if (sourceGroupId) {
            const srcGroupIdx = app.db.activeCases.findIndex(g => g.id === sourceGroupId);
            if (srcGroupIdx !== -1) {
                const srcGroup = app.db.activeCases[srcGroupIdx];
                const caseIdx = srcGroup.cases.findIndex(c => c.ticketId === draggedId);
                if (caseIdx !== -1) {
                    srcCase = srcGroup.cases.splice(caseIdx, 1)[0];
                    checkAndDissolveGroup(app, srcGroupIdx, false);
                }
            }
        } else {
            const srcIdx = app.db.activeCases.findIndex(c => c.ticketId === draggedId);
            if (srcIdx !== -1) srcCase = app.db.activeCases.splice(srcIdx, 1)[0];
        }

        const destIdx = window.app.db.activeCases.findIndex(c => c.ticketId === ticketId);

        if (srcCase && destIdx !== -1) {
            const destCase = app.db.activeCases.splice(destIdx, 1)[0];
            const totalGroupsExist = app.db.activeCases.filter(c => c.type === 'group').length + 
                                     app.db.finalizedCases.filter(c => c.type === 'group').length;

            const newGroup = {
                id: `group-${Date.now()}`,
                type: 'group',
                title: `Group ${totalGroupsExist + 1}`, 
                cases: [destCase, srcCase]
            };

            app.db.activeCases.push(newGroup);

            StorageController.save(app.db);
            if (typeof renderPortalDashboardHub === 'function') renderPortalDashboardHub();
        } else if (srcCase) {
            app.db.activeCases.push(srcCase);
            StorageController.save(app.db);
            if (typeof renderPortalDashboardHub === 'function') renderPortalDashboardHub();
        }
    });
}

module.exports = {
    buildDynamicGroupContainerCard,
    attachCardGroupingDragListeners,
    checkAndDissolveGroup
};