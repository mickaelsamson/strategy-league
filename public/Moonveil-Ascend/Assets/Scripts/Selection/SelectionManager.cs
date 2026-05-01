using System.Collections.Generic;
using MoonveilAscend.Entities;
using MoonveilAscend.Resources;
using MoonveilAscend.Workers;
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
        [SerializeField] private LayerMask groundMask = ~0;

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

            if (GetRightMouseButtonDown())
            {
                TryIssueMoveCommand();
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

            ResourceNode resourceNode = hit.collider.GetComponentInParent<ResourceNode>();

            if (resourceNode != null)
            {
                Debug.Log(
                    resourceNode.name + ": "
                    + resourceNode.ResourceType + " "
                    + resourceNode.CurrentAmount + "/"
                    + resourceNode.MaxAmount);
                ClearSelection();
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

        private void TryIssueMoveCommand()
        {
            if (selectedEntities.Count == 0)
            {
                return;
            }

            Camera activeCamera = selectionCamera != null ? selectionCamera : Camera.main;

            if (activeCamera == null)
            {
                Debug.LogWarning("SelectionManager needs a camera to raycast from.");
                return;
            }

            Ray ray = activeCamera.ScreenPointToRay(GetMousePosition());
            RaycastHit hit;

            if (!Physics.Raycast(ray, out hit, Mathf.Infinity, groundMask))
            {
                return;
            }

            ResourceNode resourceNode = hit.collider.GetComponentInParent<ResourceNode>();

            if (resourceNode != null)
            {
                IssueGatherCommand(resourceNode);
                return;
            }

            if (hit.collider.GetComponentInParent<Entity>() != null
                || hit.collider.GetComponentInParent<ResourceNode>() != null)
            {
                return;
            }

            Vector3 destination = hit.point;

            for (int i = 0; i < selectedEntities.Count; i++)
            {
                Entity selectedEntity = selectedEntities[i];

                if (selectedEntity == null || selectedEntity.Team != Team.Player)
                {
                    continue;
                }

                UnitMovement movement = selectedEntity.GetComponent<UnitMovement>();

                if (movement != null)
                {
                    WorkerGatherer gatherer = selectedEntity.GetComponent<WorkerGatherer>();

                    if (gatherer != null)
                    {
                        gatherer.StopGathering();
                    }

                    movement.MoveTo(destination);
                }
            }

            Debug.Log("Move command destination: " + destination);
        }

        private void IssueGatherCommand(ResourceNode resourceNode)
        {
            bool commandIssued = false;

            for (int i = 0; i < selectedEntities.Count; i++)
            {
                Entity selectedEntity = selectedEntities[i];

                if (selectedEntity == null || selectedEntity.Team != Team.Player)
                {
                    continue;
                }

                WorkerGatherer gatherer = selectedEntity.GetComponent<WorkerGatherer>();

                if (gatherer != null)
                {
                    gatherer.StartGathering(resourceNode);
                    commandIssued = true;
                }
            }

            if (!commandIssued)
            {
                Debug.Log("No selected workers can gather from " + resourceNode.name + ".");
            }
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

        private bool GetRightMouseButtonDown()
        {
#if ENABLE_INPUT_SYSTEM
            return Mouse.current != null && Mouse.current.rightButton.wasPressedThisFrame;
#elif ENABLE_LEGACY_INPUT_MANAGER
            return Input.GetMouseButtonDown(1);
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
