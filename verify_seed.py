import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.ai import ai_service

def verify_seed_locking():
    print("Verifying Seed Locking...")
    
    seed = 12345
    prompt = "A test character"
    
    # Generate two images with the same seed
    print(f"Generating Image A with seed {seed}...")
    img_a = ai_service.generate_image(prompt, seed=seed)
    
    print(f"Generating Image B with seed {seed}...")
    img_b = ai_service.generate_image(prompt, seed=seed)
    
    # Generate one image with a different seed
    seed_2 = 67890
    print(f"Generating Image C with seed {seed_2}...")
    img_c = ai_service.generate_image(prompt, seed=seed_2)
    
    # Check consistency
    if img_a == img_b:
        print("PASS: Image A and Image B are identical (Seed locking works).")
    else:
        print("FAIL: Image A and Image B are different!")
        
    # Check variation
    if img_a != img_c:
        print("PASS: Image A and Image C are different (Seed variation works).")
    else:
        print("FAIL: Image A and Image C are identical!")

if __name__ == "__main__":
    verify_seed_locking()
