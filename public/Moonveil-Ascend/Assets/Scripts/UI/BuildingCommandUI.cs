using System.Collections.Generic;
using MoonveilAscend.Buildings;
using MoonveilAscend.Entities;
using MoonveilAscend.Selection;
using UnityEngine;
using UnityEngine.UI;

namespace MoonveilAscend.UI
{
    /// <summary>
    /// Tiny selected-building command panel for early production testing.
    /// </summary>
    public class BuildingCommandUI : MonoBehaviour
    {
        [SerializeField] private SelectionManager selectionManager = null;
        [SerializeField] private GameObject commandPanel = null;
        [SerializeField] private Button trainWorkerButton = null;

        private PlayerMainBase selectedMainBase;

        private void Awake()
        {
            ResolveReferences();
            SetPanelVisible(false);
        }

        private void OnEnable()
        {
            ResolveReferences();

            if (selectionManager != null)
            {
                selectionManager.SelectionChanged += HandleSelectionChanged;
                HandleSelectionChanged(selectionManager.SelectedEntities);
            }

            if (trainWorkerButton != null)
            {
                trainWorkerButton.onClick.AddListener(TrainWorker);
            }
        }

        private void OnDisable()
        {
            if (selectionManager != null)
            {
                selectionManager.SelectionChanged -= HandleSelectionChanged;
            }

            if (trainWorkerButton != null)
            {
                trainWorkerButton.onClick.RemoveListener(TrainWorker);
            }
        }

        private void HandleSelectionChanged(IReadOnlyList<Entity> selectedEntities)
        {
            selectedMainBase = null;

            for (int i = 0; i < selectedEntities.Count; i++)
            {
                Entity entity = selectedEntities[i];

                if (entity != null && entity.TryGetComponent(out PlayerMainBase mainBase))
                {
                    selectedMainBase = mainBase;
                    break;
                }
            }

            SetPanelVisible(selectedMainBase != null);
        }

        private void TrainWorker()
        {
            if (selectedMainBase != null)
            {
                selectedMainBase.TrainWorker();
            }
        }

        private void SetPanelVisible(bool isVisible)
        {
            if (commandPanel != null)
            {
                commandPanel.SetActive(isVisible);
            }
        }

        private void ResolveReferences()
        {
            if (selectionManager == null)
            {
                selectionManager = FindAnyObjectByType<SelectionManager>();
            }
        }
    }
}
