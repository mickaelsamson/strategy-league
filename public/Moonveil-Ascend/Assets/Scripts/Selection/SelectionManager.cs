using System;
using System.Collections.Generic;
using MoonveilAscend.Entities;
using MoonveilAscend.Resources;
using MoonveilAscend.Workers;
using UnityEngine;
using UnityEngine.EventSystems;
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
        [SerializeField] private float dragSelectThreshold = 8f;
        [SerializeField] private float commandSpacing = 1.25f;
        [SerializeField] private float selectionIndicatorScale = 1.45f;
        [SerializeField] private Color selectionIndicatorColor = new Color(0.9f, 0.72f, 0.28f, 1f);
        [SerializeField] private Color dragBoxFillColor = new Color(0.8f, 0.65f, 0.25f, 0.18f);
        [SerializeField] private Color dragBoxBorderColor = new Color(0.95f, 0.82f, 0.35f, 0.85f);

        private readonly List<Entity> selectedEntities = new List<Entity>();
        private readonly Dictionary<Entity, GameObject> selectionIndicators = new Dictionary<Entity, GameObject>();
        private readonly List<Entity> dragSelectedEntities = new List<Entity>();
        private readonly List<Entity> validSelectedEntities = new List<Entity>();

        private Vector3 dragStartPosition;
        private bool isDragging;
        private bool isSelectionInputActive;

        public event Action<IReadOnlyList<Entity>> SelectionChanged;

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
                BeginSelectionInput();
            }

            if (GetLeftMouseButton())
            {
                UpdateSelectionInput();
            }

            if (GetLeftMouseButtonUp())
            {
                CompleteSelectionInput();
            }

            if (GetRightMouseButtonDown())
            {
                TryIssueMoveCommand();
            }
        }

        private void OnGUI()
        {
            if (!isDragging)
            {
                return;
            }

            Rect selectionRect = GetGuiSelectionRect(dragStartPosition, GetMousePosition());
            DrawScreenRect(selectionRect, dragBoxFillColor);
            DrawScreenRectBorder(selectionRect, 2f, dragBoxBorderColor);
        }

        private void OnDisable()
        {
            ClearSelection();
        }

        private void BeginSelectionInput()
        {
            if (IsPointerOverUI())
            {
                isSelectionInputActive = false;
                return;
            }

            dragStartPosition = GetMousePosition();
            isDragging = false;
            isSelectionInputActive = true;
        }

        private void UpdateSelectionInput()
        {
            if (!isSelectionInputActive || IsPointerOverUI())
            {
                return;
            }

            if (isDragging)
            {
                return;
            }

            float dragDistance = Vector2.Distance(dragStartPosition, GetMousePosition());

            if (dragDistance >= dragSelectThreshold)
            {
                isDragging = true;
            }
        }

        private void CompleteSelectionInput()
        {
            if (!isSelectionInputActive)
            {
                return;
            }

            isSelectionInputActive = false;

            if (IsPointerOverUI())
            {
                isDragging = false;
                return;
            }

            if (isDragging)
            {
                SelectEntitiesInDragBox();
                isDragging = false;
                return;
            }

            TrySelectUnderCursor();
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

            if (CanSelectEntity(entity))
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
            ClearSelection();
            AddToSelection(entity);
            NotifySelectionChanged();
            LogSelectedEntities();
        }

        private void SelectEntitiesInDragBox()
        {
            Camera activeCamera = selectionCamera != null ? selectionCamera : Camera.main;

            if (activeCamera == null)
            {
                Debug.LogWarning("SelectionManager needs a camera to drag select.");
                return;
            }

            Rect selectionRect = GetScreenSelectionRect(dragStartPosition, GetMousePosition());
            dragSelectedEntities.Clear();

            Entity[] entities = FindObjectsByType<Entity>(FindObjectsInactive.Exclude);

            for (int i = 0; i < entities.Length; i++)
            {
                Entity entity = entities[i];

                if (!CanSelectEntity(entity))
                {
                    continue;
                }

                Vector3 screenPosition = activeCamera.WorldToScreenPoint(entity.transform.position);

                if (screenPosition.z < 0f)
                {
                    continue;
                }

                if (selectionRect.Contains(new Vector2(screenPosition.x, screenPosition.y), true))
                {
                    dragSelectedEntities.Add(entity);
                }
            }

            ClearSelection();

            for (int i = 0; i < dragSelectedEntities.Count; i++)
            {
                AddToSelection(dragSelectedEntities[i]);
            }

            NotifySelectionChanged();
            LogSelectedEntities();
        }

        private void AddToSelection(Entity entity)
        {
            if (!CanSelectEntity(entity) || selectedEntities.Contains(entity))
            {
                return;
            }

            selectedEntities.Add(entity);
            SetSelectionIndicatorVisible(entity, true);
        }

        private void ClearSelection()
        {
            if (selectedEntities.Count == 0)
            {
                return;
            }

            for (int i = 0; i < selectedEntities.Count; i++)
            {
                SetSelectionIndicatorVisible(selectedEntities[i], false);
            }

            selectedEntities.Clear();
            Debug.Log("Selection cleared.");
            NotifySelectionChanged();
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
            if (IsPointerOverUI())
            {
                return;
            }

            CleanupSelectionList();

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
            validSelectedEntities.Clear();

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
                    validSelectedEntities.Add(selectedEntity);
                }
            }

            for (int i = 0; i < validSelectedEntities.Count; i++)
            {
                Entity selectedEntity = validSelectedEntities[i];
                UnitMovement movement = selectedEntity.GetComponent<UnitMovement>();
                WorkerGatherer gatherer = selectedEntity.GetComponent<WorkerGatherer>();

                if (gatherer != null)
                {
                    gatherer.StopGathering();
                }

                movement.MoveTo(destination + GetCommandOffset(i, validSelectedEntities.Count));
            }

            Debug.Log("Move command destination: " + destination);
        }

        private void IssueGatherCommand(ResourceNode resourceNode)
        {
            bool commandIssued = false;
            validSelectedEntities.Clear();

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
                    validSelectedEntities.Add(selectedEntity);
                }
            }

            for (int i = 0; i < validSelectedEntities.Count; i++)
            {
                WorkerGatherer gatherer = validSelectedEntities[i].GetComponent<WorkerGatherer>();
                gatherer.StartGathering(resourceNode, GetCommandOffset(i, validSelectedEntities.Count));
                commandIssued = true;
            }

            if (!commandIssued)
            {
                Debug.Log("No selected workers can gather from " + resourceNode.name + ".");
            }
        }

        private bool CanSelectEntity(Entity entity)
        {
            return entity != null
                && !entity.IsDead
                && entity.Team == Team.Player
                && entity.GetComponentInParent<ResourceNode>() == null;
        }

        private void CleanupSelectionList()
        {
            bool selectionChanged = false;

            for (int i = selectedEntities.Count - 1; i >= 0; i--)
            {
                Entity selectedEntity = selectedEntities[i];

                if (!CanSelectEntity(selectedEntity))
                {
                    SetSelectionIndicatorVisible(selectedEntity, false);
                    selectedEntities.RemoveAt(i);
                    selectionChanged = true;
                }
            }

            if (selectionChanged)
            {
                NotifySelectionChanged();
            }
        }

        private void NotifySelectionChanged()
        {
            SelectionChanged?.Invoke(selectedEntities);
        }

        private Vector3 GetCommandOffset(int index, int count)
        {
            if (count <= 1)
            {
                return Vector3.zero;
            }

            int columns = Mathf.CeilToInt(Mathf.Sqrt(count));
            int rows = Mathf.CeilToInt(count / (float)columns);
            int column = index % columns;
            int row = index / columns;
            float xOffset = (column - (columns - 1) * 0.5f) * commandSpacing;
            float zOffset = (row - (rows - 1) * 0.5f) * commandSpacing;

            return new Vector3(xOffset, 0f, zOffset);
        }

        private Rect GetScreenSelectionRect(Vector3 startPosition, Vector3 endPosition)
        {
            float xMin = Mathf.Min(startPosition.x, endPosition.x);
            float xMax = Mathf.Max(startPosition.x, endPosition.x);
            float yMin = Mathf.Min(startPosition.y, endPosition.y);
            float yMax = Mathf.Max(startPosition.y, endPosition.y);

            return Rect.MinMaxRect(xMin, yMin, xMax, yMax);
        }

        private Rect GetGuiSelectionRect(Vector3 startPosition, Vector3 endPosition)
        {
            Vector3 guiStart = new Vector3(startPosition.x, Screen.height - startPosition.y, 0f);
            Vector3 guiEnd = new Vector3(endPosition.x, Screen.height - endPosition.y, 0f);
            float xMin = Mathf.Min(guiStart.x, guiEnd.x);
            float xMax = Mathf.Max(guiStart.x, guiEnd.x);
            float yMin = Mathf.Min(guiStart.y, guiEnd.y);
            float yMax = Mathf.Max(guiStart.y, guiEnd.y);

            return Rect.MinMaxRect(xMin, yMin, xMax, yMax);
        }

        private void SetSelectionIndicatorVisible(Entity entity, bool isVisible)
        {
            if (entity == null)
            {
                return;
            }

            GameObject indicator;

            if (!selectionIndicators.TryGetValue(entity, out indicator) || indicator == null)
            {
                if (!isVisible)
                {
                    return;
                }

                indicator = CreateSelectionIndicator(entity);
                selectionIndicators[entity] = indicator;
            }

            indicator.SetActive(isVisible);
        }

        private GameObject CreateSelectionIndicator(Entity entity)
        {
            GameObject indicator = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            indicator.name = "Selection Indicator";
            indicator.transform.SetParent(entity.transform, false);
            indicator.transform.localPosition = new Vector3(0f, -0.51f, 0f);
            indicator.transform.localRotation = Quaternion.identity;
            indicator.transform.localScale = new Vector3(selectionIndicatorScale, 0.02f, selectionIndicatorScale);

            Collider indicatorCollider = indicator.GetComponent<Collider>();

            if (indicatorCollider != null)
            {
                Destroy(indicatorCollider);
            }

            Renderer indicatorRenderer = indicator.GetComponent<Renderer>();

            if (indicatorRenderer != null)
            {
                indicatorRenderer.material = CreateSelectionIndicatorMaterial();
            }

            return indicator;
        }

        private Material CreateSelectionIndicatorMaterial()
        {
            Shader shader = Shader.Find("Universal Render Pipeline/Lit");

            if (shader == null)
            {
                shader = Shader.Find("Standard");
            }

            Material material = new Material(shader);

            if (material.HasProperty("_BaseColor"))
            {
                material.SetColor("_BaseColor", selectionIndicatorColor);
            }
            else if (material.HasProperty("_Color"))
            {
                material.SetColor("_Color", selectionIndicatorColor);
            }

            return material;
        }

        private static void DrawScreenRect(Rect rect, Color color)
        {
            Color previousColor = GUI.color;
            GUI.color = color;
            GUI.DrawTexture(rect, Texture2D.whiteTexture);
            GUI.color = previousColor;
        }

        private static void DrawScreenRectBorder(Rect rect, float thickness, Color color)
        {
            DrawScreenRect(new Rect(rect.xMin, rect.yMin, rect.width, thickness), color);
            DrawScreenRect(new Rect(rect.xMin, rect.yMax - thickness, rect.width, thickness), color);
            DrawScreenRect(new Rect(rect.xMin, rect.yMin, thickness, rect.height), color);
            DrawScreenRect(new Rect(rect.xMax - thickness, rect.yMin, thickness, rect.height), color);
        }

        private bool IsPointerOverUI()
        {
            return EventSystem.current != null && EventSystem.current.IsPointerOverGameObject();
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

        private bool GetLeftMouseButton()
        {
#if ENABLE_INPUT_SYSTEM
            return Mouse.current != null && Mouse.current.leftButton.isPressed;
#elif ENABLE_LEGACY_INPUT_MANAGER
            return Input.GetMouseButton(0);
#else
            return false;
#endif
        }

        private bool GetLeftMouseButtonUp()
        {
#if ENABLE_INPUT_SYSTEM
            return Mouse.current != null && Mouse.current.leftButton.wasReleasedThisFrame;
#elif ENABLE_LEGACY_INPUT_MANAGER
            return Input.GetMouseButtonUp(0);
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
