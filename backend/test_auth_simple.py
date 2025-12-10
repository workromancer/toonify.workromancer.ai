import google.auth
import os

print("--- AI Authentication Diagnostic Script ---")
print(f"GOOGLE_CLOUD_PROJECT env: {os.environ.get('GOOGLE_CLOUD_PROJECT')}")

try:
    credentials, project = google.auth.default()
    print(f"Credentials obtained: {credentials}")
    print(f"Project from auth: {project}")
    
    if hasattr(credentials, 'service_account_email'):
        print(f"Service Account Email: {credentials.service_account_email}")
    
    import warnings
    # Filter deprecation warnings for cleaner output
    warnings.filterwarnings("ignore", category=UserWarning)

except Exception as e:
    print(f"Error obtaining default credentials: {e}")
    print("\nSUGGESTION: Run 'gcloud auth application-default login' to set up local ADC.")
