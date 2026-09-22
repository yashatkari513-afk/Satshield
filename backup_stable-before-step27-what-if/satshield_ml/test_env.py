"""
SATSHIELD ML Environment Verification Test Script
Tests successful import and version resolution for required ML dependencies.
"""
import sys

def main():
    print("=" * 60)
    print("SATSHIELD ML Environment Verification Test")
    print("=" * 60)
    print(f"Python Executable: {sys.executable}")
    print(f"Python Version   : {sys.version.split()[0]}")
    print("-" * 60)

    try:
        import numpy as np
        print(f"[PASS] numpy        : version {np.__version__}")
    except ImportError as e:
        print(f"[FAIL] numpy import failed: {e}")
        sys.exit(1)

    try:
        import pandas as pd
        print(f"[PASS] pandas       : version {pd.__version__}")
    except ImportError as e:
        print(f"[FAIL] pandas import failed: {e}")
        sys.exit(1)

    try:
        import sklearn
        print(f"[PASS] scikit-learn : version {sklearn.__version__}")
    except ImportError as e:
        print(f"[FAIL] scikit-learn import failed: {e}")
        sys.exit(1)

    try:
        import joblib
        print(f"[PASS] joblib       : version {joblib.__version__}")
    except ImportError as e:
        print(f"[FAIL] joblib import failed: {e}")
        sys.exit(1)

    print("-" * 60)
    print("RESULT: SATSHIELD ML Environment verification PASSED successfully.")
    print("=" * 60)
    sys.exit(0)

if __name__ == "__main__":
    main()
