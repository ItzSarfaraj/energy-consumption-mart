
import numpy as np
import pandas as pd

# Reproducibility: to ensure that repeated runs produces the same sequnce of random values
RANDOM_SEED = 42
rng = np.random.default_rng(RANDOM_SEED)

# Dataset configuration
NUM_METERS = 10
NUM_DAYS = 30
INTERVAL_MINUTES = 15

# Generate meter IDs and assign each meter to a site
meter_ids = [f"M{i:03d}" for i in range(1, NUM_METERS + 1)] # list comprehension for createing formatted meter ids

site_ids = { # dictionary mapping for meterids with site
    meter_id: f"SITE{((i - 1) // 2) + 1:02d}"
    for i, meter_id in enumerate(meter_ids, start=1) ## two meter per site
}

# Fixed starting date for reproducible synthetic data
START_DATE = "2026-01-01"

# Each day has 96 intervals of 15 minutes
intervals_per_day = 24 * 60 // INTERVAL_MINUTES

# Generate timestamps, including the initial baseline reading
timestamps = pd.date_range(# generate sequnce of regularly spaced timestamps
    start=START_DATE,
    periods=NUM_DAYS * intervals_per_day + 1,
    freq=f"{INTERVAL_MINUTES}min",
)

# print("Meters:", len(meter_ids))
# print("Sites:", len(set(site_ids.values())))
# print("Timestamps per meter:", len(timestamps))
# print("Expected intervals per meter:", len(timestamps) - 1)
# print("First timestamp:", timestamps[0])
# print("Last timestamp:", timestamps[-1])



def simulate_interval_consumption(timestamps, meter_index):
    """Simulate energy consumed during each 15-minute interval.Returns one consumption value per interval, not per timestamp."""
    # Hour of day for each interval's ending timestamp
    hours = timestamps[1:].hour.to_numpy()

    # Higher consumption during daytime and evening
    base_load = np.select(#applying different value based on conditions
        [
            (hours >= 0) & (hours < 6),    # Night
            (hours >= 6) & (hours < 9),    # Morning
            (hours >= 9) & (hours < 17),   # Working hours
            (hours >= 17) & (hours < 22),  # Evening
        ],
        [ 0.25, 0.70, 0.50, 1.00,],
        default=0.35,  # Late evening
    )

    # Each meter has a slightly different consumption scale
    meter_scale = 0.8 + (meter_index * 0.08)

    # Add realistic random variation around the base load
    noise = rng.normal(
        loc=0.0,
        scale=0.08,
        size=len(timestamps) - 1,
    )

    # Ensure interval consumption is never negative
    consumption = np.maximum(
        (base_load + noise) * meter_scale,
        0.05,
    )

    return np.round(consumption, 3)


# Test the function using the first meter
# test_consumption = simulate_interval_consumption(timestamps, 0)

# print("Intervals generated:", len(test_consumption))
# print("Minimum consumption:", test_consumption.min(), "kWh")
# print("Maximum consumption:", test_consumption.max(), "kWh")
# print("Average consumption:", round(test_consumption.mean(), 3), "kWh")



# Store readings for all meters
all_readings = []

for meter_index, meter_id in enumerate(meter_ids):
    # Generate consumption for each 15-minute interval
    consumption = simulate_interval_consumption(
        timestamps,
        meter_index,
    )

    # Set the initial cumulative meter reading
    initial_reading = 1000.0 + (meter_index * 100)

    # Convert interval consumption into cumulative readings
    cumulative_readings = np.concatenate([
        [initial_reading],
        initial_reading + np.cumsum(consumption),## cumsum = cumulative sum
    ])

    # Create one record for each timestamp
    meter_df = pd.DataFrame({
        "meter_id": meter_id,
        "site_id": site_ids[meter_id],
        "reading_timestamp": timestamps,
        "cumulative_kwh": np.round(cumulative_readings, 3),
    })

    all_readings.append(meter_df)

# Combine readings from all meters into one dataset
df = pd.concat(all_readings, ignore_index=True)

# Sort records for consistent downstream processing
df = df.sort_values(
    ["meter_id", "reading_timestamp"]
).reset_index(drop=True)

print("\nDataset shape:", df.shape)
print("\nFirst five rows:")
print(df.head())

print("\nReadings per meter:")
print(df.groupby("meter_id").size())

print("\nMissing values:")
print(df.isnull().sum())



from pathlib import Path

# Find the project root relative to this Python file
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Define the output CSV path
OUTPUT_FILE = PROJECT_ROOT / "data" / "sample_readings.csv"

# Export the clean baseline dataset
df.to_csv(OUTPUT_FILE, index=False)

print("\nClean dataset saved to:", OUTPUT_FILE)



# Basic data-quality checks
assert len(df) == NUM_METERS * len(timestamps)
assert df["meter_id"].nunique() == NUM_METERS
assert df["site_id"].nunique() == 5
assert df["cumulative_kwh"].notna().all()
assert (df["cumulative_kwh"] >= 0).all()

# Each meter should have the expected number of readings
readings_per_meter = df.groupby("meter_id").size()
assert (readings_per_meter == len(timestamps)).all()

# Verify that each meter has unique timestamps
assert not df.duplicated(
    subset=["meter_id", "reading_timestamp"]
).any()

print("All baseline validation checks passed.")



##  creating a seprate dataset with intentional anomalies


anomalous_df = df.copy()

# 1. M001: Duplicate an existing reading
m001 = anomalous_df[
    anomalous_df["meter_id"] == "M001"
].sort_values("reading_timestamp")

duplicate_index = m001.index[100]
duplicate_row = anomalous_df.loc[[duplicate_index]].copy()

# 2. M002: Remove one reading to create a missing interval
m002 = anomalous_df[
    anomalous_df["meter_id"] == "M002"
].sort_values("reading_timestamp")

missing_index = m002.index[200]
anomalous_df = anomalous_df.drop(index=missing_index)

# 3. M003: Introduce a null cumulative reading
m003 = anomalous_df[
    anomalous_df["meter_id"] == "M003"
].sort_values("reading_timestamp")

null_index = m003.index[300]
anomalous_df.loc[null_index, "cumulative_kwh"] = np.nan

# 4. M004: Introduce an invalid negative reading
m004 = anomalous_df[
    anomalous_df["meter_id"] == "M004"
].sort_values("reading_timestamp")

negative_index = m004.index[400]
anomalous_df.loc[negative_index, "cumulative_kwh"] = -10.0

# 5. M005: Simulate a meter counter reset
m005 = anomalous_df[
    anomalous_df["meter_id"] == "M005"
].sort_values("reading_timestamp")

previous_index = m005.index[499]
reset_index = m005.index[500]

previous_reading = anomalous_df.loc[
    previous_index, "cumulative_kwh"
]

# Keep the reset value positive, but lower than the previous reading
anomalous_df.loc[
    reset_index, "cumulative_kwh"
] = max(previous_reading - 50.0, 0.0)

# Add the duplicate record after other modifications
anomalous_df = pd.concat(
    [anomalous_df, duplicate_row],
    ignore_index=True,
)

# Sort without removing the intentional duplicate
anomalous_df = anomalous_df.sort_values(
    ["meter_id", "reading_timestamp"]
).reset_index(drop=True)

# Save the anomalous dataset separately
ANOMALY_FILE = PROJECT_ROOT / "data" / "sample_readings_with_anomalies.csv"

anomalous_df.to_csv(ANOMALY_FILE, index=False)

print("\nAnomalous dataset saved to:", ANOMALY_FILE)
print("Clean dataset shape:", df.shape)
print("Anomalous dataset shape:", anomalous_df.shape)
print(
    "Duplicate meter/timestamp pairs:",
    anomalous_df.duplicated(
        subset=["meter_id", "reading_timestamp"]
    ).sum(),
)
print(
    "Null cumulative readings:",
    anomalous_df["cumulative_kwh"].isna().sum(),
)
print(
    "Negative cumulative readings:",
    (anomalous_df["cumulative_kwh"] < 0).sum(),
)

