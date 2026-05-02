using UnityEngine;

namespace MoonveilAscend.Workers
{
    /// <summary>
    /// Rotates a unit smoothly toward its movement direction.
    /// Safe visual-only script: does not modify movement logic.
    /// </summary>
    public class FaceMovementDirection : MonoBehaviour
    {
        [Header("Rotation")]
        [SerializeField] private Transform visualRoot;
        [SerializeField] private float rotationSpeed = 12f;
        [SerializeField] private float movementThreshold = 0.01f;

        [Header("Model Forward Offset")]
        [Tooltip("Use this if the model faces the wrong direction. Try 0, 90, -90, or 180.")]
        [SerializeField] private float yRotationOffset = 0f;

        private Vector3 previousPosition;

        private void Awake()
        {
            if (visualRoot == null)
            {
                visualRoot = transform;
            }

            previousPosition = transform.position;
        }

        private void LateUpdate()
        {
            Vector3 delta = transform.position - previousPosition;
            delta.y = 0f;

            if (delta.sqrMagnitude > movementThreshold * movementThreshold)
            {
                Quaternion targetRotation = Quaternion.LookRotation(delta.normalized, Vector3.up);
                targetRotation *= Quaternion.Euler(0f, yRotationOffset, 0f);

                visualRoot.rotation = Quaternion.Slerp(
                    visualRoot.rotation,
                    targetRotation,
                    Time.deltaTime * rotationSpeed
                );
            }

            previousPosition = transform.position;
        }
    }
}