using UnityEngine;

namespace MoonveilAscend.Resources
{
    public enum ResourceType
    {
        Essence,
        Stone,
        Nature
    }

    /// <summary>
    /// Passive map resource that can be depleted by future worker gathering.
    /// </summary>
    public class ResourceNode : MonoBehaviour
    {
        [SerializeField] private ResourceType resourceType;
        [SerializeField] private int maxAmount = 2000;
        [SerializeField] private int currentAmount = 2000;
        [SerializeField] private bool logWhenDepleted = true;

        private bool hasLoggedDepletion;

        public ResourceType ResourceType
        {
            get { return resourceType; }
            set { resourceType = value; }
        }

        public int MaxAmount
        {
            get { return maxAmount; }
            set
            {
                maxAmount = Mathf.Max(0, value);
                currentAmount = Mathf.Clamp(currentAmount, 0, maxAmount);
            }
        }

        public int CurrentAmount
        {
            get { return currentAmount; }
            private set { currentAmount = Mathf.Clamp(value, 0, maxAmount); }
        }

        public bool IsDepleted
        {
            get { return currentAmount <= 0; }
        }

        private void Awake()
        {
            maxAmount = Mathf.Max(0, maxAmount);
            currentAmount = Mathf.Clamp(currentAmount, 0, maxAmount);
            hasLoggedDepletion = IsDepleted;
        }

        public int GatherAmount(int amount)
        {
            if (amount <= 0 || IsDepleted)
            {
                return 0;
            }

            int gatheredAmount = Mathf.Min(amount, currentAmount);
            CurrentAmount -= gatheredAmount;

            if (IsDepleted && logWhenDepleted && !hasLoggedDepletion)
            {
                hasLoggedDepletion = true;
                Debug.Log(name + " depleted.");
            }

            return gatheredAmount;
        }

        private void OnValidate()
        {
            maxAmount = Mathf.Max(0, maxAmount);
            currentAmount = Mathf.Clamp(currentAmount, 0, maxAmount);
        }
    }
}
