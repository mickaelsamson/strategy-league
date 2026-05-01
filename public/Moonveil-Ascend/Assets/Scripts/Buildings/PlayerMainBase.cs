using MoonveilAscend.Entities;
using MoonveilAscend.Resources;
using UnityEngine;

namespace MoonveilAscend.Buildings
{
    /// <summary>
    /// Minimal player town-center style building that trains worker units.
    /// </summary>
    [RequireComponent(typeof(Entity))]
    public class PlayerMainBase : MonoBehaviour
    {
        [SerializeField] private GameObject workerPrefab = null;
        [SerializeField] private Transform spawnPoint = null;
        [SerializeField] private Vector3 spawnOffset = new Vector3(3.5f, -1f, 0f);
        [SerializeField] private int trainWorkerCostVitalis = 50;
        [SerializeField] private int workerPopulationCost = 1;
        [SerializeField] private float trainDuration = 3f;
        [SerializeField] private ResourceManager resourceManager = null;

        private float trainTimer;
        private bool isTraining;

        public int TrainWorkerCostVitalis
        {
            get { return trainWorkerCostVitalis; }
            set { trainWorkerCostVitalis = Mathf.Max(0, value); }
        }

        public int WorkerPopulationCost
        {
            get { return workerPopulationCost; }
            set { workerPopulationCost = Mathf.Max(0, value); }
        }

        public float TrainDuration
        {
            get { return trainDuration; }
            set { trainDuration = Mathf.Max(0f, value); }
        }

        public bool IsTraining
        {
            get { return isTraining; }
        }

        private void Awake()
        {
            ResolveReferences();
        }

        private void Update()
        {
            if (!isTraining)
            {
                return;
            }

            trainTimer += Time.deltaTime;

            if (trainTimer >= trainDuration)
            {
                CompleteWorkerTraining();
            }
        }

        public void TrainWorker()
        {
            ResolveReferences();

            if (isTraining)
            {
                Debug.Log(name + " is already training a worker.");
                return;
            }

            if (workerPrefab == null)
            {
                Debug.LogWarning(name + " needs a WorkerPrefab before it can train workers.");
                return;
            }

            if (resourceManager == null)
            {
                Debug.LogWarning(name + " needs a ResourceManager before it can train workers.");
                return;
            }

            if (resourceManager.PopulationAvailable < workerPopulationCost)
            {
                Debug.Log("Population limit reached. Cannot train worker.");
                return;
            }

            if (!resourceManager.CanAfford(ResourceType.Vitalis, trainWorkerCostVitalis))
            {
                Debug.Log("Not enough Vitalis to train worker.");
                return;
            }

            if (!resourceManager.SpendResource(ResourceType.Vitalis, trainWorkerCostVitalis))
            {
                Debug.Log("Not enough Vitalis to train worker.");
                return;
            }

            trainTimer = 0f;
            isTraining = true;
            Debug.Log(name + " started training worker.");
        }

        private void CompleteWorkerTraining()
        {
            isTraining = false;
            trainTimer = 0f;

            if (resourceManager == null)
            {
                ResolveReferences();
            }

            if (resourceManager == null || !resourceManager.AddPopulationUsed(workerPopulationCost))
            {
                Debug.Log("Population limit reached. Cannot finish worker training.");
                return;
            }

            GameObject worker = Instantiate(workerPrefab, GetSpawnPosition(), Quaternion.identity);
            worker.name = "Player Worker";

            Debug.Log(name + " trained worker.");
        }

        private Vector3 GetSpawnPosition()
        {
            if (spawnPoint != null)
            {
                return spawnPoint.position;
            }

            return transform.position + spawnOffset;
        }

        private void ResolveReferences()
        {
            if (resourceManager == null)
            {
                resourceManager = FindAnyObjectByType<ResourceManager>();
            }
        }

        private void OnValidate()
        {
            trainWorkerCostVitalis = Mathf.Max(0, trainWorkerCostVitalis);
            workerPopulationCost = Mathf.Max(0, workerPopulationCost);
            trainDuration = Mathf.Max(0f, trainDuration);
        }
    }
}
