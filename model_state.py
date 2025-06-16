# model_state.py

_model = "kmeans"  # giá trị mặc định


def get_model():
    return _model


def set_model(name: str):
    global _model
    _model = name
