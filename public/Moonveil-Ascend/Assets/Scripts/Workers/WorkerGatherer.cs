using MoonveilAscend.Entities;
using MoonveilAscend.Resources;
using UnityEngine;

namespace MoonveilAscend.Workers
{
    public enum WorkerGatherState
    {
        Idle,
        MovingToResource,
        Gathering,
        ReturningToBase,
        Depositing
    }

    /// <summary>
    /// First-pass worker resource loop: resource node, base, repeat.
    /// </summary>
    [RequireComponent(typeof(UnitMovement))]
    public class WorkerGatherer : MonoBehaviour
    {
        private const float InteractionDistance = 0.5f;

        [SerializeField] private int carryCapacity = 10;
        [SerializeField] private float gatherDuration = 1.5f;
        [SerializeField] private ResourceNode currentResourceTarget;
        [SerializeField] private Transform depositTarget;
        [SerializeField] private ResourceManager resourceManager;
        [SerializeField] private WorkerGatherState state = WorkerGatherState.Idle;

        private UnitMovement movement;
        private ResourceType carriedResourceType;
        private int carriedAmount;
        private float gatherTimer;
        private Vector3 gatheringOffset;

        public int CarryCapacity
        {
            get { return carryCapacity; }
            set { carryCapacity = Mathf.Max(1, value); }
        }

        public float GatherDuration
        {
            get { return gatherDuration; }
            set { gatherDuration = Mathf.Max(0f, value); }
        }

        public ResourceNode CurrentResourceTarget
        {
            get { return currentResourceTarget; }
        }

        public ResourceType CarriedResourceType
        {
            get { return carriedResourceType; }
        }

        public int CarriedAmount
        {
            get { return carriedAmount; }
        }

        public WorkerGatherState State
        {
            get { return state; }
        }

        private void Awake()
        {
            movement = GetComponent<UnitMovement>();
            ResolveReferences();
        }

        private void Update()
        {
            switch (state)
            {
                case WorkerGatherState.MovingToResource:
                    UpdateMovingToResource();
                    break;
                case WorkerGatherState.Gathering:
                    UpdateGathering();
                    break;
                case WorkerGatherState.ReturningToBase:
                    UpdateReturningToBase();
                    break;
                case WorkerGatherState.Depositing:
                    DepositCarriedResources();
                    break;
            }
        }

        public void StartGathering(ResourceNode resourceNode)
        {
            StartGathering(resourceNode, Vector3.zero);
        }

        public void StartGathering(ResourceNode resourceNode, Vector3 interactionOffset)
        {
            if (resourceNode == null)
            {
                return;
            }

            if (resourceNode.IsDepleted)
            {
                StopGathering();
                Debug.Log(name + " cannot gather from depleted node " + resourceNode.name + ".");
                return;
            }

            ResolveReferences();

            if (depositTarget == null)
            {
                StopGathering();
                Debug.LogWarning(name + " needs a deposit target before gathering.");
                return;
            }

            currentResourceTarget = resourceNode;
            carriedAmount = 0;
            carriedResourceType = resourceNode.ResourceType;
            gatheringOffset = new Vector3(interactionOffset.x, 0f, interactionOffset.z);
            gatherTimer = 0f;
            state = WorkerGatherState.MovingToResource;
            movement.MoveTo(GetResourceInteractionPosition());

            Debug.Log(name + " started gathering " + resourceNode.ResourceType + " from " + resourceNode.name + ".");
        }

        public void StopGathering()
        {
            state = WorkerGatherState.Idle;
            gatherTimer = 0f;
            currentResourceTarget = null;
            carriedAmount = 0;
            gatheringOffset = Vector3.zero;
        }

        private void UpdateMovingToResource()
        {
            if (currentResourceTarget == null)
            {
                StopGathering();
                return;
            }

            if (currentResourceTarget.IsDepleted)
            {
                Debug.Log(name + " stopped gathering because " + currentResourceTarget.name + " is depleted.");
                StopGathering();
                return;
            }

            if (!IsCloseTo(GetResourceInteractionPosition()))
            {
                return;
            }

            movement.Stop();
            gatherTimer = 0f;
            state = WorkerGatherState.Gathering;
        }

        private void UpdateGathering()
        {
            if (currentResourceTarget == null)
            {
                StopGathering();
                return;
            }

            if (currentResourceTarget.IsDepleted)
            {
                Debug.Log(name + " stopped gathering because " + currentResourceTarget.name + " is depleted.");
                StopGathering();
                return;
            }

            gatherTimer += Time.deltaTime;

            if (gatherTimer < gatherDuration)
            {
                return;
            }

            carriedResourceType = currentResourceTarget.ResourceType;
            carriedAmount = currentResourceTarget.GatherAmount(carryCapacity);

            if (carriedAmount <= 0)
            {
                Debug.Log(name + " stopped gathering because " + currentResourceTarget.name + " is depleted.");
                StopGathering();
                return;
            }

            Debug.Log(name + " gathered " + carriedAmount + " " + carriedResourceType + ".");
            state = WorkerGatherState.ReturningToBase;
            movement.MoveTo(GetDepositInteractionPosition());
        }

        private void UpdateReturningToBase()
        {
            if (depositTarget == null)
            {
                StopGathering();
                Debug.LogWarning(name + " lost its deposit target.");
                return;
            }

            if (!IsCloseTo(GetDepositInteractionPosition()))
            {
                return;
            }

            movement.Stop();
            state = WorkerGatherState.Depositing;
        }

        private void DepositCarriedResources()
        {
            if (carriedAmount <= 0)
            {
                ReturnToResourceOrStop();
                return;
            }

            ResolveReferences();

            if (resourceManager == null)
            {
                Debug.LogWarning(name + " cannot deposit resources because no ResourceManager was found.");
                StopGathering();
                return;
            }

            resourceManager.AddResource(carriedResourceType, carriedAmount);
            Debug.Log(name + " deposited " + carriedAmount + " " + carriedResourceType + ".");
            Debug.Log(
                "Resource totals - Essence: " + resourceManager.Essence
                + ", Stone: " + resourceManager.Stone
                + ", Nature: " + resourceManager.Nature);

            carriedAmount = 0;
            ReturnToResourceOrStop();
        }

        private void ReturnToResourceOrStop()
        {
            if (currentResourceTarget == null || currentResourceTarget.IsDepleted)
            {
                if (currentResourceTarget != null)
                {
                    Debug.Log(name + " stopped gathering because " + currentResourceTarget.name + " is depleted.");
                }

                StopGathering();
                return;
            }

            state = WorkerGatherState.MovingToResource;
            movement.MoveTo(GetResourceInteractionPosition());
        }

        private Vector3 GetResourceInteractionPosition()
        {
            if (currentResourceTarget == null)
            {
                return transform.position;
            }

            return currentResourceTarget.transform.position + gatheringOffset;
        }

        private Vector3 GetDepositInteractionPosition()
        {
            if (depositTarget == null)
            {
                return transform.position;
            }

            return depositTarget.position + gatheringOffset;
        }

        private bool IsCloseTo(Vector3 worldPosition)
        {
            Vector3 currentPosition = transform.position;
            Vector3 flatTarget = new Vector3(worldPosition.x, currentPosition.y, worldPosition.z);
            float stopDistance = movement != null ? movement.StopDistance : 0f;
            return Vector3.Distance(currentPosition, flatTarget) <= stopDistance + InteractionDistance;
        }

        private void ResolveReferences()
        {
            if (resourceManager == null)
            {
                resourceManager = FindAnyObjectByType<ResourceManager>();
            }

            if (depositTarget == null)
            {
                GameObject baseObject = GameObject.Find("Player Main Base Placeholder");

                if (baseObject != null)
                {
                    depositTarget = baseObject.transform;
                }
            }
        }

        private void OnValidate()
        {
            carryCapacity = Mathf.Max(1, carryCapacity);
            gatherDuration = Mathf.Max(0f, gatherDuration);
        }
    }
}
