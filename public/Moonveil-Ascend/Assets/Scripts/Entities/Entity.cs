using System;
using UnityEngine;

namespace MoonveilAscend.Entities
{
    public enum Team
    {
        Player,
        Enemy,
        Neutral
    }

    /// <summary>
    /// Shared base component for selectable and damageable world objects.
    /// </summary>
    public class Entity : MonoBehaviour
    {
        [SerializeField] private string entityName = "Entity";
        [SerializeField] private Team team = Team.Neutral;
        [SerializeField] private int maxHealth = 100;
        [SerializeField] private int currentHealth = 100;

        private bool isDead;

        public event Action<Entity> HealthChanged;
        public event Action<Entity> Died;

        public string EntityName
        {
            get { return entityName; }
            set { entityName = string.IsNullOrWhiteSpace(value) ? "Entity" : value; }
        }

        public Team Team
        {
            get { return team; }
            set { team = value; }
        }

        public int MaxHealth
        {
            get { return maxHealth; }
            set
            {
                maxHealth = Mathf.Max(1, value);
                CurrentHealth = Mathf.Clamp(currentHealth, 0, maxHealth);
            }
        }

        public int CurrentHealth
        {
            get { return currentHealth; }
            private set
            {
                int clampedValue = Mathf.Clamp(value, 0, maxHealth);

                if (currentHealth == clampedValue)
                {
                    return;
                }

                currentHealth = clampedValue;
                HealthChanged?.Invoke(this);
            }
        }

        public bool IsDead
        {
            get { return isDead; }
        }

        protected virtual void Awake()
        {
            maxHealth = Mathf.Max(1, maxHealth);
            currentHealth = Mathf.Clamp(currentHealth, 0, maxHealth);
        }

        public virtual void TakeDamage(int amount)
        {
            if (isDead || amount <= 0)
            {
                return;
            }

            CurrentHealth -= amount;

            if (CurrentHealth <= 0)
            {
                Die();
            }
        }

        public virtual void Die()
        {
            if (isDead)
            {
                return;
            }

            isDead = true;
            Died?.Invoke(this);
            Destroy(gameObject);
        }

        private void OnValidate()
        {
            maxHealth = Mathf.Max(1, maxHealth);
            currentHealth = Mathf.Clamp(currentHealth, 0, maxHealth);
        }
    }
}
