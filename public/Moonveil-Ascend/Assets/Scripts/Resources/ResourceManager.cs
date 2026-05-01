using System;
using UnityEngine;

namespace MoonveilAscend.Resources
{
    [Serializable]
    public struct ResourceCost
    {
        public int Essence;
        public int Stone;
        public int Vitalis;
        public int Population;
    }

    /// <summary>
    /// Tracks player economy values and broadcasts changes for future UI binding.
    /// </summary>
    public class ResourceManager : MonoBehaviour
    {
        [Header("Resources")]
        [SerializeField] private int essence;
        [SerializeField] private int stone;
        [SerializeField] private int vitalis;

        [Header("Population")]
        [SerializeField] private int populationUsed;
        [SerializeField] private int populationMax = 30;

        public event Action ResourcesChanged;
        public event Action<ResourceType, int> ResourceChanged;
        public event Action<int, int> PopulationChanged;

        public int Essence
        {
            get { return essence; }
        }

        public int Stone
        {
            get { return stone; }
        }

        public int Vitalis
        {
            get { return vitalis; }
        }

        public int PopulationUsed
        {
            get { return populationUsed; }
        }

        public int PopulationMax
        {
            get { return populationMax; }
        }

        public int PopulationAvailable
        {
            get { return populationMax - populationUsed; }
        }

        public void AddResource(ResourceType resourceType, int amount)
        {
            if (amount <= 0)
            {
                return;
            }

            switch (resourceType)
            {
                case ResourceType.Essence:
                    essence += amount;
                    break;
                case ResourceType.Stone:
                    stone += amount;
                    break;
                case ResourceType.Vitalis:
                    vitalis += amount;
                    break;
                default:
                    throw new ArgumentOutOfRangeException(nameof(resourceType), resourceType, null);
            }

            NotifyResourceChanged(resourceType);
        }

        public bool SpendResource(ResourceType resourceType, int amount)
        {
            if (amount <= 0)
            {
                return true;
            }

            if (!CanAfford(resourceType, amount))
            {
                return false;
            }

            switch (resourceType)
            {
                case ResourceType.Essence:
                    essence -= amount;
                    break;
                case ResourceType.Stone:
                    stone -= amount;
                    break;
                case ResourceType.Vitalis:
                    vitalis -= amount;
                    break;
                default:
                    throw new ArgumentOutOfRangeException(nameof(resourceType), resourceType, null);
            }

            NotifyResourceChanged(resourceType);
            return true;
        }

        public bool CanAfford(ResourceType resourceType, int amount)
        {
            if (amount <= 0)
            {
                return true;
            }

            switch (resourceType)
            {
                case ResourceType.Essence:
                    return essence >= amount;
                case ResourceType.Stone:
                    return stone >= amount;
                case ResourceType.Vitalis:
                    return vitalis >= amount;
                default:
                    throw new ArgumentOutOfRangeException(nameof(resourceType), resourceType, null);
            }
        }

        public bool SpendResource(ResourceCost cost)
        {
            if (!CanAfford(cost))
            {
                return false;
            }

            essence -= Mathf.Max(0, cost.Essence);
            stone -= Mathf.Max(0, cost.Stone);
            vitalis -= Mathf.Max(0, cost.Vitalis);
            populationUsed += Mathf.Max(0, cost.Population);

            ResourcesChanged?.Invoke();
            PopulationChanged?.Invoke(populationUsed, populationMax);
            return true;
        }

        public bool CanAfford(ResourceCost cost)
        {
            return essence >= Mathf.Max(0, cost.Essence)
                && stone >= Mathf.Max(0, cost.Stone)
                && vitalis >= Mathf.Max(0, cost.Vitalis)
                && PopulationAvailable >= Mathf.Max(0, cost.Population);
        }

        public void SetPopulationMax(int amount)
        {
            populationMax = Mathf.Max(0, amount);
            populationUsed = Mathf.Clamp(populationUsed, 0, populationMax);
            PopulationChanged?.Invoke(populationUsed, populationMax);
            ResourcesChanged?.Invoke();
        }

        public bool AddPopulationUsed(int amount)
        {
            if (amount <= 0)
            {
                return true;
            }

            if (PopulationAvailable < amount)
            {
                return false;
            }

            populationUsed += amount;
            PopulationChanged?.Invoke(populationUsed, populationMax);
            ResourcesChanged?.Invoke();
            return true;
        }

        public void FreePopulation(int amount)
        {
            if (amount <= 0)
            {
                return;
            }

            populationUsed = Mathf.Max(0, populationUsed - amount);
            PopulationChanged?.Invoke(populationUsed, populationMax);
            ResourcesChanged?.Invoke();
        }

        private void NotifyResourceChanged(ResourceType resourceType)
        {
            ResourceChanged?.Invoke(resourceType, GetResourceAmount(resourceType));
            ResourcesChanged?.Invoke();
        }

        private int GetResourceAmount(ResourceType resourceType)
        {
            switch (resourceType)
            {
                case ResourceType.Essence:
                    return essence;
                case ResourceType.Stone:
                    return stone;
                case ResourceType.Vitalis:
                    return vitalis;
                default:
                    throw new ArgumentOutOfRangeException(nameof(resourceType), resourceType, null);
            }
        }

        private void OnValidate()
        {
            essence = Mathf.Max(0, essence);
            stone = Mathf.Max(0, stone);
            vitalis = Mathf.Max(0, vitalis);
            populationMax = Mathf.Max(0, populationMax);
            populationUsed = Mathf.Clamp(populationUsed, 0, populationMax);
        }
    }
}
