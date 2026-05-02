using MoonveilAscend.Entities;
using UnityEngine;

namespace MoonveilAscend.Workers
{
    /// <summary>
    /// Drives the Worker Animator parameters without changing existing gameplay logic.
    /// Safe bridge between UnitMovement / WorkerGatherer and the Animator Controller.
    /// 
    /// Expected Animator bool parameters:
    /// - IsMoving
    /// - IsGathering
    /// - IsDead
    /// </summary>
    [RequireComponent(typeof(Animator))]
    public class WorkerAnimatorDriver : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private Animator animator;
        [SerializeField] private WorkerGatherer workerGatherer;
        [SerializeField] private Entity entity;

        [Header("Movement Detection")]
        [SerializeField] private float movementThreshold = 0.01f;

        private static readonly int IsMovingHash = Animator.StringToHash("IsMoving");
        private static readonly int IsGatheringHash = Animator.StringToHash("IsGathering");
        private static readonly int IsDeadHash = Animator.StringToHash("IsDead");

        private Vector3 previousPosition;

        private void Awake()
        {
            if (animator == null)
            {
                animator = GetComponent<Animator>();
            }

            if (workerGatherer == null)
            {
                workerGatherer = GetComponent<WorkerGatherer>();
            }

            if (entity == null)
            {
                entity = GetComponent<Entity>();
            }

            previousPosition = transform.position;
        }

        private void Update()
        {
            if (animator == null)
            {
                return;
            }

            bool isDead = entity != null && entity.IsDead;
            bool isGathering = workerGatherer != null && workerGatherer.State == WorkerGatherState.Gathering;
            bool isMoving = DetectMovement();

            // If gathering, gathering animation has priority over walking.
            if (isGathering)
            {
                isMoving = false;
            }

            animator.SetBool(IsDeadHash, isDead);
            animator.SetBool(IsGatheringHash, isGathering);
            animator.SetBool(IsMovingHash, isMoving);

            previousPosition = transform.position;
        }

        private bool DetectMovement()
        {
            Vector3 currentPosition = transform.position;
            Vector3 delta = currentPosition - previousPosition;
            delta.y = 0f;

            if (delta.magnitude > movementThreshold)
            {
                return true;
            }

            if (workerGatherer == null)
            {
                return false;
            }

            return workerGatherer.State == WorkerGatherState.MovingToResource
                || workerGatherer.State == WorkerGatherState.ReturningToBase;
        }
    }
}