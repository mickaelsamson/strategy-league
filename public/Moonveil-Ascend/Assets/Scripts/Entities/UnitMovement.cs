using UnityEngine;
using UnityEngine.AI;

namespace MoonveilAscend.Workers
{
    /// <summary>
    /// NavMesh-based movement controller for RTS units.
    /// Keeps a simple public API for selection, gathering, and worker systems.
    /// </summary>
    [RequireComponent(typeof(NavMeshAgent))]
    public class UnitMovement : MonoBehaviour
    {
        [Header("Movement")]
        [SerializeField] private float moveSpeed = 3.5f;
        [SerializeField] private float stopDistance = 0.2f;
        [SerializeField] private float acceleration = 12f;
        [SerializeField] private float angularSpeed = 720f;

        [Header("Debug")]
        [SerializeField] private bool logMovement;

        private NavMeshAgent agent;
        private Vector3 currentDestination;
        private bool hasDestination;

        public float MoveSpeed
        {
            get { return moveSpeed; }
            set
            {
                moveSpeed = Mathf.Max(0f, value);
                ApplyAgentSettings();
            }
        }

        public float StopDistance
        {
            get { return stopDistance; }
            set
            {
                stopDistance = Mathf.Max(0f, value);
                ApplyAgentSettings();
            }
        }

        public bool HasDestination
        {
            get { return hasDestination; }
        }

        public Vector3 CurrentDestination
        {
            get { return currentDestination; }
        }

        public bool IsMoving
        {
            get
            {
                if (agent == null || !agent.enabled || !agent.isOnNavMesh)
                {
                    return false;
                }

                if (!hasDestination)
                {
                    return false;
                }

                if (agent.pathPending)
                {
                    return true;
                }

                if (agent.remainingDistance > agent.stoppingDistance + 0.05f)
                {
                    return true;
                }

                return agent.velocity.sqrMagnitude > 0.01f;
            }
        }

        private void Awake()
        {
            agent = GetComponent<NavMeshAgent>();
            ApplyAgentSettings();
        }

        private void OnEnable()
        {
            if (agent == null)
            {
                agent = GetComponent<NavMeshAgent>();
            }

            ApplyAgentSettings();
        }

        public void MoveTo(Vector3 destination)
        {
            if (agent == null)
            {
                agent = GetComponent<NavMeshAgent>();
            }

            if (agent == null || !agent.enabled)
            {
                return;
            }

            if (!agent.isOnNavMesh)
            {
                Debug.LogWarning(name + " cannot move because it is not on a NavMesh.");
                return;
            }

            Vector3 sampledDestination;

            if (!TrySampleNavMesh(destination, out sampledDestination))
            {
                Debug.LogWarning(name + " could not find a valid NavMesh position near destination.");
                return;
            }

            currentDestination = sampledDestination;
            hasDestination = true;

            agent.isStopped = false;
            agent.SetDestination(sampledDestination);

            if (logMovement)
            {
                Debug.Log(name + " moving to " + sampledDestination);
            }
        }

        public void Stop()
        {
            hasDestination = false;

            if (agent == null || !agent.enabled || !agent.isOnNavMesh)
            {
                return;
            }

            agent.isStopped = true;
            agent.ResetPath();
        }

        public void SetStoppingDistance(float distance)
        {
            StopDistance = distance;
        }

        private bool TrySampleNavMesh(Vector3 position, out Vector3 sampledPosition)
        {
            NavMeshHit hit;

            if (NavMesh.SamplePosition(position, out hit, 3f, NavMesh.AllAreas))
            {
                sampledPosition = hit.position;
                return true;
            }

            sampledPosition = position;
            return false;
        }

        private void ApplyAgentSettings()
        {
            if (agent == null)
            {
                return;
            }

            agent.speed = moveSpeed;
            agent.stoppingDistance = stopDistance;
            agent.acceleration = acceleration;
            agent.angularSpeed = angularSpeed;

            // We rotate the visual/model separately with FaceMovementDirection.
            // Keeping this false avoids conflict with the custom visual direction script.
            agent.updateRotation = false;
        }

        private void OnValidate()
        {
            moveSpeed = Mathf.Max(0f, moveSpeed);
            stopDistance = Mathf.Max(0f, stopDistance);
            acceleration = Mathf.Max(0f, acceleration);
            angularSpeed = Mathf.Max(0f, angularSpeed);

            if (Application.isPlaying)
            {
                ApplyAgentSettings();
            }
        }
    }
}