import os
from unittest.mock import patch

from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
from transformers.dynamic_module_utils import get_imports


def fixed_get_imports(filename: str | os.PathLike) -> list[str]:
    """Remove flash_attn import for specific files."""
    if not str(filename).endswith("/modeling_phi.py"):
        return get_imports(filename)
    imports = get_imports(filename)
    imports.remove("flash_attn")
    imports.remove("inops")
    imports.remove("causal_conv1d")
    imports.remove("mamba_ssm")
    return imports


model_path = "/Users/eddie/Documents/cortexdoc_build_n1/tensors/hymba1.5"

with patch("transformers.dynamic_module_utils.get_imports", fixed_get_imports):
    model = AutoModelForCausalLM.from_pretrained(model_path, trust_remote_code=True)
    tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)

# Save in a format that might be more compatible
model.save_pretrained("./hymba_converted")
tokenizer.save_pretrained("./hymba_converted")