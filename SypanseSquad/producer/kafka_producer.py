"""
producer/kafka_producer.py
--------------------------
Alias entry point — delegates to producer.py.
The canonical producer script is producer/producer.py.

Usage:
    python producer/kafka_producer.py
"""
import runpy, os

_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'producer.py')
runpy.run_path(_script, run_name='__main__')
