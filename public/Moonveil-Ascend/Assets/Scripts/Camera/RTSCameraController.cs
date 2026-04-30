using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace MoonveilAscend.CameraControls
{
    /// <summary>
    /// Basic top-down/isometric RTS camera movement and zoom controller.
    /// </summary>
    [RequireComponent(typeof(Camera))]
    public class RTSCameraController : MonoBehaviour
    {
        [Header("Movement")]
        [SerializeField] private float movementSpeed = 20f;

        [Header("Zoom")]
        [SerializeField] private float zoomSpeed = 250f;
        [SerializeField] private float minZoom = 10f;
        [SerializeField] private float maxZoom = 60f;

        private Camera controlledCamera;
        private Vector3 lastMousePosition;

        public float MovementSpeed
        {
            get { return movementSpeed; }
            set { movementSpeed = Mathf.Max(0f, value); }
        }

        public float ZoomSpeed
        {
            get { return zoomSpeed; }
            set { zoomSpeed = Mathf.Max(0f, value); }
        }

        public float MinZoom
        {
            get { return minZoom; }
            set
            {
                minZoom = Mathf.Max(0.1f, value);
                maxZoom = Mathf.Max(minZoom, maxZoom);
                ClampZoom();
            }
        }

        public float MaxZoom
        {
            get { return maxZoom; }
            set
            {
                maxZoom = Mathf.Max(minZoom, value);
                ClampZoom();
            }
        }

        private void Awake()
        {
            controlledCamera = GetComponent<Camera>();
            ClampZoom();
        }

        private void Update()
        {
            HandleKeyboardMovement();
            HandleMouseWheelZoom();
            HandleMiddleMousePanning();
        }

        private void HandleKeyboardMovement()
        {
            Vector2 keyboardInput = GetKeyboardInput();
            float horizontal = keyboardInput.x;
            float vertical = keyboardInput.y;

            Vector3 moveDirection = GetPlanarForward() * vertical + GetPlanarRight() * horizontal;

            if (moveDirection.sqrMagnitude > 1f)
            {
                moveDirection.Normalize();
            }

            transform.position += moveDirection * movementSpeed * Time.deltaTime;
        }

        private void HandleMouseWheelZoom()
        {
            float scrollDelta = GetScrollDelta();

            if (Mathf.Approximately(scrollDelta, 0f))
            {
                return;
            }

            if (controlledCamera.orthographic)
            {
                controlledCamera.orthographicSize = Mathf.Clamp(
                    controlledCamera.orthographicSize - scrollDelta * zoomSpeed * Time.deltaTime,
                    minZoom,
                    maxZoom);
                return;
            }

            Vector3 position = transform.position;
            position.y = Mathf.Clamp(position.y - scrollDelta * zoomSpeed * Time.deltaTime, minZoom, maxZoom);
            transform.position = position;
        }

        private void HandleMiddleMousePanning()
        {
            if (GetMiddleMouseButtonDown())
            {
                lastMousePosition = GetMousePosition();
            }

            if (!GetMiddleMouseButton())
            {
                return;
            }

            Vector3 currentMousePosition = GetMousePosition();
            Vector3 mouseDelta = currentMousePosition - lastMousePosition;
            Vector3 panDirection = -GetPlanarRight() * mouseDelta.x - GetPlanarForward() * mouseDelta.y;
            transform.position += panDirection * movementSpeed * 0.01f;
            lastMousePosition = currentMousePosition;
        }

        private Vector2 GetKeyboardInput()
        {
            float horizontal = 0f;
            float vertical = 0f;

#if ENABLE_INPUT_SYSTEM
            Keyboard keyboard = Keyboard.current;

            if (keyboard != null)
            {
                if (keyboard.aKey.isPressed || keyboard.leftArrowKey.isPressed)
                {
                    horizontal -= 1f;
                }

                if (keyboard.dKey.isPressed || keyboard.rightArrowKey.isPressed)
                {
                    horizontal += 1f;
                }

                if (keyboard.sKey.isPressed || keyboard.downArrowKey.isPressed)
                {
                    vertical -= 1f;
                }

                if (keyboard.wKey.isPressed || keyboard.upArrowKey.isPressed)
                {
                    vertical += 1f;
                }
            }
#elif ENABLE_LEGACY_INPUT_MANAGER
            if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow))
            {
                horizontal -= 1f;
            }

            if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow))
            {
                horizontal += 1f;
            }

            if (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow))
            {
                vertical -= 1f;
            }

            if (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow))
            {
                vertical += 1f;
            }
#endif

            return new Vector2(horizontal, vertical);
        }

        private float GetScrollDelta()
        {
#if ENABLE_INPUT_SYSTEM
            if (Mouse.current != null)
            {
                return Mouse.current.scroll.ReadValue().y / 120f;
            }

            return 0f;
#elif ENABLE_LEGACY_INPUT_MANAGER
            return Input.mouseScrollDelta.y;
#else
            return 0f;
#endif
        }

        private bool GetMiddleMouseButtonDown()
        {
#if ENABLE_INPUT_SYSTEM
            return Mouse.current != null && Mouse.current.middleButton.wasPressedThisFrame;
#elif ENABLE_LEGACY_INPUT_MANAGER
            return Input.GetMouseButtonDown(2);
#else
            return false;
#endif
        }

        private bool GetMiddleMouseButton()
        {
#if ENABLE_INPUT_SYSTEM
            return Mouse.current != null && Mouse.current.middleButton.isPressed;
#elif ENABLE_LEGACY_INPUT_MANAGER
            return Input.GetMouseButton(2);
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

        private Vector3 GetPlanarForward()
        {
            Vector3 forward = transform.forward;
            forward.y = 0f;
            return forward.sqrMagnitude > 0f ? forward.normalized : Vector3.forward;
        }

        private Vector3 GetPlanarRight()
        {
            Vector3 right = transform.right;
            right.y = 0f;
            return right.sqrMagnitude > 0f ? right.normalized : Vector3.right;
        }

        private void ClampZoom()
        {
            if (controlledCamera == null)
            {
                return;
            }

            if (controlledCamera.orthographic)
            {
                controlledCamera.orthographicSize = Mathf.Clamp(controlledCamera.orthographicSize, minZoom, maxZoom);
                return;
            }

            Vector3 position = transform.position;
            position.y = Mathf.Clamp(position.y, minZoom, maxZoom);
            transform.position = position;
        }

        private void OnValidate()
        {
            movementSpeed = Mathf.Max(0f, movementSpeed);
            zoomSpeed = Mathf.Max(0f, zoomSpeed);
            minZoom = Mathf.Max(0.1f, minZoom);
            maxZoom = Mathf.Max(minZoom, maxZoom);

            controlledCamera = GetComponent<Camera>();
            ClampZoom();
        }
    }
}
