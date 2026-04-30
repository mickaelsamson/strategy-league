using UnityEngine;

namespace MoonveilAscend.Entities
{
    /// <summary>
    /// Minimal transform-based unit movement for early RTS interaction testing.
    /// </summary>
    public class UnitMovement : MonoBehaviour
    {
        [SerializeField] private float moveSpeed = 5f;
        [SerializeField] private float stopDistance = 0.1f;

        private Vector3 targetPosition;
        private bool hasTarget;

        public float MoveSpeed
        {
            get { return moveSpeed; }
            set { moveSpeed = Mathf.Max(0f, value); }
        }

        public float StopDistance
        {
            get { return stopDistance; }
            set { stopDistance = Mathf.Max(0f, value); }
        }

        private void Awake()
        {
            targetPosition = transform.position;
        }

        private void Update()
        {
            if (!hasTarget)
            {
                return;
            }

            Vector3 currentPosition = transform.position;
            Vector3 flatTarget = new Vector3(targetPosition.x, currentPosition.y, targetPosition.z);
            Vector3 toTarget = flatTarget - currentPosition;

            if (toTarget.magnitude <= stopDistance)
            {
                transform.position = flatTarget;
                hasTarget = false;
                return;
            }

            transform.position = Vector3.MoveTowards(
                currentPosition,
                flatTarget,
                moveSpeed * Time.deltaTime);
        }

        public void MoveTo(Vector3 worldPosition)
        {
            targetPosition = new Vector3(worldPosition.x, transform.position.y, worldPosition.z);
            hasTarget = true;
        }

        public void Stop()
        {
            hasTarget = false;
            targetPosition = transform.position;
        }

        private void OnValidate()
        {
            moveSpeed = Mathf.Max(0f, moveSpeed);
            stopDistance = Mathf.Max(0f, stopDistance);
        }
    }
}
