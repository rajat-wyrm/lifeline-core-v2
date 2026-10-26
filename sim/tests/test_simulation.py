import unittest
from sim.city_model import CityModel
from sim.request_generator import RequestGenerator
from sim.policies import NearestHospitalPolicy, PortalCountPolicy, LifelineCorePolicy
from sim.simulator import SimulationEngine

class TestSimulationSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.city = CityModel()

    def test_city_model_loading(self):
        self.assertEqual(len(self.city.hospitals), 50)
        self.assertGreater(len(self.city.nodes), 10)
        # Verify travel time calculation between PGI and GMCH 32
        pgi = self.city.hospital_map['HOSP-101']
        gmch = self.city.hospital_map['HOSP-102']
        t_sec, d_km = self.city.calculate_travel_time_sec(pgi['lat'], pgi['lon'], gmch['lat'], gmch['lon'])
        self.assertGreater(t_sec, 60.0)
        self.assertGreater(d_km, 3.0)

    def test_request_generator_reproducibility(self):
        gen1 = RequestGenerator(seed=123)
        w1 = gen1.generate_workload(num_requests=50)

        gen2 = RequestGenerator(seed=123)
        w2 = gen2.generate_workload(num_requests=50)

        self.assertEqual(len(w1), 50)
        self.assertEqual(w1[0]['request_id'], 'PAT-100001')
        self.assertEqual(w1[0], w2[0])
        self.assertEqual(w1[-1], w2[-1])

    def test_three_policy_execution(self):
        gen = RequestGenerator(seed=42)
        workload = gen.generate_workload(num_requests=30)

        sim_near = SimulationEngine(city=self.city, seed=42)
        res_near = sim_near.run_simulation(workload, NearestHospitalPolicy())
        self.assertEqual(res_near['total_requests'], 30)

        sim_portal = SimulationEngine(city=self.city, seed=42)
        res_portal = sim_portal.run_simulation(workload, PortalCountPolicy())
        self.assertEqual(res_portal['total_requests'], 30)

        sim_life = SimulationEngine(city=self.city, seed=42)
        res_life = sim_life.run_simulation(workload, LifelineCorePolicy())
        self.assertEqual(res_life['total_requests'], 30)
        # Invariant: Double allocations must be zero
        self.assertEqual(res_life['double_allocation_count'], 0)

if __name__ == '__main__':
    unittest.main()
