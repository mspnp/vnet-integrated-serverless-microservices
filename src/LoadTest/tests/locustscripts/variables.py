import random
import string
import datetime

from locust import between

class Variables:
    sub_key = ""
    wait_time = between(1, 5)
    patient_ids = []
    patient_test_ids = []

def randomString(stringLength = 6):
    letters = string.ascii_uppercase
    return ''.join(random.choice(letters) for i in range(stringLength))

def GenerateRandomPatient():
    fistName = randomString()
    lastName = f"LT_{randomString()}"
    return {
        "firstName": fistName,
        "lastName": lastName,
        "fullName": f"{fistName} {lastName}",
        "gender": random.choice(["male", "female", "other", "unknown"]),
        "dateOfBirth": f"{random.randrange(1920, 2020)}-{str(random.randrange(1, 12)).zfill(2)}-{str(random.randrange(1, 28)).zfill(2)}",
        "postCode": str(random.randrange(1000, 9999)),
        "insuranceNumber": str(random.randrange(9999999999)),
        "preferredContactNumber": str(random.randrange(9999999999))
    }

def GenerateRandomTest(patientId):
    return {
        "patientId": patientId,
        "performer": randomString(),
        "orderReference": randomString(),
        "observations": [{
            "id": randomString(),
            "code": randomString(),
            "measurement": randomString(),
            "interpretation": randomString(),
            "issued": datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "status": randomString()
        }]
    }
