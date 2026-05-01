using MoonveilAscend.Resources;
using UnityEngine;
using UnityEngine.UI;

namespace MoonveilAscend.UI
{
    /// <summary>
    /// Simple top-bar binding for the current player resource totals.
    /// </summary>
    public class ResourceBarUI : MonoBehaviour
    {
        [SerializeField] private ResourceManager resourceManager = null;
        [SerializeField] private Text essenceText = null;
        [SerializeField] private Text stoneText = null;
        [SerializeField] private Text natureText = null;
        [SerializeField] private Text populationText = null;

        private void OnEnable()
        {
            ResolveResourceManager();
            Subscribe();
            Refresh();
        }

        private void Start()
        {
            Refresh();
        }

        private void OnDisable()
        {
            Unsubscribe();
        }

        public void Refresh()
        {
            if (resourceManager == null)
            {
                ResolveResourceManager();
            }

            if (resourceManager == null)
            {
                return;
            }

            SetText(essenceText, "Essence: " + resourceManager.Essence);
            SetText(stoneText, "Stone: " + resourceManager.Stone);
            SetText(natureText, "Nature: " + resourceManager.Nature);
            SetText(populationText, "Population: " + resourceManager.PopulationUsed + " / " + resourceManager.PopulationMax);
        }

        private void ResolveResourceManager()
        {
            if (resourceManager == null)
            {
                resourceManager = FindAnyObjectByType<ResourceManager>();
            }
        }

        private void Subscribe()
        {
            if (resourceManager == null)
            {
                return;
            }

            resourceManager.ResourcesChanged += Refresh;
            resourceManager.PopulationChanged += HandlePopulationChanged;
        }

        private void Unsubscribe()
        {
            if (resourceManager == null)
            {
                return;
            }

            resourceManager.ResourcesChanged -= Refresh;
            resourceManager.PopulationChanged -= HandlePopulationChanged;
        }

        private void HandlePopulationChanged(int used, int max)
        {
            Refresh();
        }

        private static void SetText(Text targetText, string value)
        {
            if (targetText != null)
            {
                targetText.text = value;
            }
        }
    }
}
