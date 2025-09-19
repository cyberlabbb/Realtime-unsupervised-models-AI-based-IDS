# state.py

from threading import Event

# ------------- Model state -------------
_model = "kmeans"  # default model

def get_model():
    return _model

def set_model(name: str):
    global _model
    _model = name


# ------------- Capture state -------------

packet_count = 0
packet_buffer = []
file_index = 0
all_predictions = []
sniff_thread = None
sniff_control = Event()
is_sniffing = False
total_packet_count = 0


def get_total_packet_count():
    return total_packet_count


def set_total_packet_count(val):
    global total_packet_count
    total_packet_count = val
