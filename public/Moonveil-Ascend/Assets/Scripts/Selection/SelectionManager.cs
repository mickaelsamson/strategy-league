using System.Collections.Generic;
using MoonveilAscend.Entities;
using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace MoonveilAscend.Selection
{
    /// <summary>
    /// Handles basic player-owned entity selection through mouse raycasts.
    /// </summary>
    public class SelectionManager : MonoBehaviour
    {
        [SerializeField] private Camera selectionCamera;
        [SerializeField] private LayerMask selectionMask = ~0;

        private readonly List<Entity> selectedEntities = new List<Entity>();

        public IReadOnlyList<Entity> SelectedEntities
        {
            get { return selectedEntities; }
        }

        private void Awake()
        {
            if (selectionCamera == null)
            {
                selectionCamera = Camera.main;
            }
        }

        private void Update()
        {
            if (GetLeftMouseButtonDown())
            {
                TrySelectUnderCursor();
            }
        }

        private void TrySelectUnderCursor()
        {
            Camera activeCamera = selectionCamera != null ? selectionCamera : Camera.main;

            if (activeCamera == null)
            {
                Debug.LogWarning("SelectionManager needs a camera to raycast from.");
                return;
            }

            Ray ray = activeCamera.ScreenPointToRay(GetMousePosition());
            RaycastHit hit;

            if (!Physics.Raycast(ray, out hit, Mathf.Infinity, selectionMask))
            {
                ClearSelection();
                return;
            }

            Entity entity = hit.collider.GetComponentInParent<Entity>();

            if (entity != null && entity.Team == Team.Player)
            {
                SelectSingle(entity);
                return;
            }

            ClearSelection();
        }

        private void SelectSingle(Entity entity)
        {
            selectedEntities.Clear();
            selectedEntities.Add(entity);
            LogSelectedEntities();
        }

        private void ClearSelection()
        {
            if (selectedEntities.Count == 0)
            {
                return;
            }

            selectedEntities.Clear();
            Debug.Log("Selection cleared.");
        }

        private void LogSelectedEntities()
        {
            if (selectedEntities.Count == 0)
            {
                Debug.Log("No entities selected.");
                return;
            }

            List<string> selectedNames = new List<string>();

            for (int i = 0; i < selectedEntities.Count; i++)
            {
                selectedNames.Add(selectedEntities[i].EntityName);
            }

            Debug.Log("Selected: " + string.Join(", ", selectedNames));
        }

        private bool GetLeftMouseButtonDown()
        {
#if ENABLE_INPUT_SYSTEM
            return Mouse.current != null && Mouse.current.leftButton.wasPressedThisFrame;
#elif ENABLE_LEGACY_INPUT_MANAGER
            return Input.GetMouseButtonDown(0);
#else
            return false;
#endif
        }

        private Vector3 GetMousePosition()
        {
#if ENABLE_INPUT_SYSTEM
            if (Mouse.current != null)
            {
                Vector2 position = Mouse.current.position.ReadValue();
                return new Vector3(position.x, position.y, 0f);
            }

            return Vector3.zero;
#elif ENABLE_LEGACY_INPUT_MANAGER
            return Input.mousePosition;
#else
            return Vector3.zero;
#endif
        }
    }
}
