import random
import json

from locust import TaskSet, task
from locust.contrib.fasthttp import FastHttpLocust

from .variables import Variables, GenerateRandomPatient, GenerateRandomTest

# Echo
def Echo(self):
    return self.client.get(
        "echo/resource?param1=sample", 
        headers = {
            "Ocp-Apim-Subscription-Key": Variables.sub_key
        },
        catch_response = True
    )

class EchoTaskSet(TaskSet):
    @task
    def EchoTask(self):
        with Echo(self) as response:
            if response.status_code != 200:
                response.failure(f"Code: {response.status_code} | Content: {response.text} | Task: EchoTask")

class EchoLocust(FastHttpLocust):
    wait_time = Variables.wait_time
    task_set = EchoTaskSet

# Create patient
def CreatePatient(self, data):
    return self.client.post(
        "patient/",
        json.dumps(data),
        name = "patient/",
        headers = {
            "Ocp-Apim-Subscription-Key": Variables.sub_key
        },
        catch_response = True
    )

class CreatePatientTaskSet(TaskSet):
    @task(9)
    def CreateValidPatient(self):
        with CreatePatient(self, GenerateRandomPatient()) as response:
            if response.status_code == 201:
                Variables.patient_ids.append(json.loads(response.text)["id"])
            else:
                response.failure(f"Code: {response.status_code} | Content: {response.text} | Task: CreateValidPatient")

    @task(1)
    def CreateInvalidPatient(self):
        with CreatePatient(self, { "lastName": "LT" }) as response:
            if response.status_code == 400:
                response.success()
            else:
                response.failure(f"Code: {response.status_code} | Content: {response.text} | Task: CreateInvalidPatient")

class CreatePatientLocust(FastHttpLocust):
    wait_time = Variables.wait_time
    task_set = CreatePatientTaskSet

# Load patient
def LoadPatient(self, id):
    return self.client.get(
        f"patient/{id}",
        name = "patient/{random_id}",
        headers = {
            "Ocp-Apim-Subscription-Key": Variables.sub_key
        },
        catch_response = True
    )

class LoadPatientTaskSet(TaskSet):
    @task(9)
    def LoadValidPatient(self):
        if Variables.patient_ids:
            random_id = random.choice(Variables.patient_ids)
            with LoadPatient(self, random_id) as response:
                if response.status_code != 200:
                    response.failure(f"Code: {response.status_code} | Content: {response.text} | Task: LoadValidPatient")

    @task(1)
    def LoadInvalidPatient(self):
        with LoadPatient(self, "1") as response:
            if response.status_code == 404:
                response.success()
            else:
                response.failure(f"Code: {response.status_code} | Content: {response.text} | Task: LoadInvalidPatient")

class LoadPatientLocust(FastHttpLocust):
    wait_time = Variables.wait_time
    task_set = LoadPatientTaskSet

# Update patient
def UpdatePatient(self, data):
    return self.client.put(
        f"patient/{data['id']}",
        json.dumps(data),
        name = "patient/{ramdom_id}",
        headers = {
            "Ocp-Apim-Subscription-Key": Variables.sub_key
        },
        catch_response = True
    )

class UpdatePatientTaskSet(TaskSet):
    @task
    def UpdatePatientTask(self):
        if Variables.patient_ids:
            random_id = random.choice(Variables.patient_ids)
            with LoadPatient(self, random_id) as response:
                if response.status_code == 200:
                    patient = json.loads(response.text)
                    with UpdatePatient(self, patient) as response:
                        if response.status_code != 200:
                            response.failure(f"Code: {response.status_code} | Content: {response.text} | Task: UpdatePatientTask")
                else:
                    response.failure(f"Code: {response.status_code} | Content: {response.text} | Task: UpdatePatientTask")

class UpdatePatientLocust(FastHttpLocust):
    wait_time = Variables.wait_time
    task_set = UpdatePatientTaskSet

# Search patient
def SearchPatient(self, data):
    return self.client.post(
        "patient/search",
        data = json.dumps(data), 
        name = "patient/search",
        headers = {
            "Ocp-Apim-Subscription-Key": Variables.sub_key
        },
        catch_response = True
    )

class SearchPatientTaskSet(TaskSet):    
    @task(1)
    def SearchPatientWithId(self):
        if Variables.patient_ids:
            random_id = random.choice(Variables.patient_ids)
            with SearchPatient(self, {
                "id": random_id
            }) as response:
                if response.status_code != 200:
                    response.failure(f"Code: {response.status_code} | Content: {response.text} | Task: SearchPatientWithId")
    
    @task(1)
    def SearchAllPatients(self):
        if Variables.patient_ids:
            with SearchPatient(self, {}) as response:
                if response.status_code != 200:
                    response.failure(f"Code: {response.status_code} | Content: {response.text} | Task: SearchAllPatients")

class SearchPatientLocust(FastHttpLocust):
    wait_time = Variables.wait_time
    task_set = SearchPatientTaskSet

# Create test
def CreateTest(self, data):
    return self.client.post(
        f"patient/{data['patientId']}/tests",
        json.dumps(data),
        name = "patient/{random_id}/tests",
        headers = {
            "Ocp-Apim-Subscription-Key": Variables.sub_key
        },
        catch_response = True
    )

class CreateTestTaskSet(TaskSet):
    @task(9)
    def CreateValidTest(self):
        if Variables.patient_ids:
            random_id = random.choice(Variables.patient_ids)
            with CreateTest(self, GenerateRandomTest(random_id)) as response:
                if response.status_code == 201:
                    test = json.loads(response.text)
                    Variables.patient_test_ids.append({
                        "patientId": test["patientId"],
                        "id": test["id"]
                    })
                else:
                    response.failure(f"Code: {response.status_code} | Content: {response.text} | Task: CreateValidTest")

    @task(1)
    def CreateInvalidTest(self):
        with CreateTest(self, GenerateRandomTest("1")) as response:
            if response.status_code == 400:
                response.success()
            else:
                response.failure(f"Code: {response.status_code} | Content: {response.text} | Task: CreateInvalidTest")

class CreateTestLocust(FastHttpLocust):
    wait_time = Variables.wait_time
    task_set = CreateTestTaskSet

# Load tests
def LoadTests(self, id):
    return self.client.get(
        f"patient/{id}/tests/",
        name = "patient/{random_id}/tests/",
        headers = {
            "Ocp-Apim-Subscription-Key": Variables.sub_key
        },
        catch_response = True
    )

class LoadTestsTaskSet(TaskSet):
    @task(9)
    def LoadTestsWithValidPatient(self):
        if Variables.patient_test_ids:
            test = random.choice(Variables.patient_test_ids)
            with LoadTests(self, test["patientId"]) as response:
                if response.status_code != 200:
                    response.failure(f"Code: {response.status_code} | Content: {response.text} | Task: LoadTestsWithValidPatient")

    @task(1)
    def LoadTestsWithInvalidPatient(self):
        with LoadTests(self, "1") as response:
            if response.status_code == 404:
                response.success()
            else:
                response.failure(f"Code: {response.status_code} | Content: {response.text} | Task: LoadTestsWithInvalidPatient")

class LoadTestsLocust(FastHttpLocust):
    wait_time = Variables.wait_time
    task_set = LoadTestsTaskSet

# Load test
def LoadTest(self, pid, tid):
    return self.client.get(
        f"patient/{pid}/tests/{tid}",
        name = "patient/{random_pid}/tests/{random_tid}",
        headers = {
            "Ocp-Apim-Subscription-Key": Variables.sub_key
        },
        catch_response = True
    )

class LoadTestTaskSet(TaskSet):
    @task(9)
    def LoadTestWithValidTest(self):
        if Variables.patient_test_ids:
            test = random.choice(Variables.patient_test_ids)
            with LoadTest(self, test["patientId"], test["id"]) as response:
                if response.status_code != 200:
                    response.failure(f"Code: {response.status_code} | Content: {response.text} | Task: LoadTestWithValidTest")

    @task(1)
    def LoadTestWithInvalidTest(self):
        if Variables.patient_test_ids:
            test = random.choice(Variables.patient_test_ids)
            with LoadTest(self, test["patientId"], "1") as response:
                if response.status_code == 404:
                    response.success()
                else:
                    response.failure(f"Code: {response.status_code} | Content: {response.text} | Task: LoadTestWithInvalidTest")

class LoadTestLocust(FastHttpLocust):
    wait_time = Variables.wait_time
    task_set = LoadTestTaskSet

# All
class AllTaskSet(TaskSet):
    tasks = {
        EchoTaskSet: 1,
        CreatePatientTaskSet: 1,
        LoadPatientTaskSet: 1,
        UpdatePatientTaskSet: 1,
        SearchPatientTaskSet: 1,
        CreateTestTaskSet: 1,
        LoadTestsTaskSet: 1,
        LoadTestTaskSet: 1
    }

    @task
    def index(self):
        pass
    
class AllLocust(FastHttpLocust):
    wait_time = Variables.wait_time
    task_set = AllTaskSet
