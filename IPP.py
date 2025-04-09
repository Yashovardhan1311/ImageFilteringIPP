import streamlit as st
import numpy as np
from PIL import Image
import io

# Streamlit page configuration
st.set_page_config(page_title="Image Filtering", layout="centered")

# Title
st.title("Image Filtering")

# File uploader
uploaded_file = st.file_uploader("Upload an image", type=["jpg", "png", "jpeg"])

# Initialize session state for image data
if "original_image" not in st.session_state:
    st.session_state.original_image = None
if "filtered_image" not in st.session_state:
    st.session_state.filtered_image = None

# Function to adjust image size
def adjust_image_size(image, max_width=600, max_height=600):
    width, height = image.size
    scale_factor = min(max_width / width, max_height / height, 1)
    new_width = int(width * scale_factor)
    new_height = int(height * scale_factor)
    return image.resize((new_width, new_height), Image.Resampling.LANCZOS)

# Function to convert image to numpy array
def image_to_array(image):
    return np.array(image)

# Function to convert array back to image
def array_to_image(array):
    return Image.fromarray(np.uint8(array))

# Convolution function
def convolution(image_array, kernel):
    side = int(np.sqrt(kernel.size))
    half_side = side // 2
    height, width = image_array.shape[:2]
    output = np.zeros_like(image_array)
    
    for y in range(height):
        for x in range(width):
            r, g, b = 0, 0, 0
            for cy in range(side):
                for cx in range(side):
                    scy = y + cy - half_side
                    scx = x + cx - half_side
                    if 0 <= scy < height and 0 <= scx < width:
                        wt = kernel[cy * side + cx]
                        r += image_array[scy, scx, 0] * wt
                        g += image_array[scy, scx, 1] * wt
                        b += image_array[scy, scx, 2] * wt
            output[y, x] = [min(255, max(0, r)), min(255, max(0, g)), min(255, max(0, b))]
    return output

# Filter functions
def apply_filter(image_array, filter_type):
    if filter_type == "blur" or filter_type == "smooth":
        kernel = np.ones(9) / 9
        return convolution(image_array, kernel)
    elif filter_type == "sharpen":
        kernel = np.array([0, -1, 0, -1, 5, -1, 0, -1, 0])
        return convolution(image_array, kernel)
    elif filter_type == "invert":
        return 255 - image_array
    elif filter_type == "grayscale":
        avg = np.mean(image_array, axis=2)
        return np.stack([avg, avg, avg], axis=2)
    return image_array

# Adjustments function
def apply_adjustments(image_array, intensity, brightness, contrast):
    adjusted = image_array.copy().astype(float)
    
    # Brightness
    adjusted += brightness
    adjusted = np.clip(adjusted, 0, 255)
    
    # Contrast
    factor = contrast
    adjusted = ((adjusted - 128) * factor) + 128
    adjusted = np.clip(adjusted, 0, 255)
    
    # Intensity
    adjusted *= intensity
    adjusted = np.clip(adjusted, 0, 255)
    
    return adjusted

# Process uploaded image
if uploaded_file is not None:
    image = Image.open(uploaded_file).convert("RGB")
    resized_image = adjust_image_size(image)
    st.session_state.original_image = image_to_array(resized_image)
    st.session_state.filtered_image = st.session_state.original_image.copy()

# Display canvases
col1, col2 = st.columns(2)
with col1:
    st.subheader("Original")
    if st.session_state.original_image is not None:
        st.image(st.session_state.original_image, use_column_width=True)
with col2:
    st.subheader("Filtered")
    if st.session_state.filtered_image is not None:
        st.image(st.session_state.filtered_image, use_column_width=True)

# Controls
st.subheader("Controls")
col_btn1, col_btn2, col_btn3 = st.columns(3)
with col_btn1:
    if st.button("Blur"):
        st.session_state.current_filter = "blur"
with col_btn1:
    if st.button("Sharpen"):
        st.session_state.current_filter = "sharpen"
with col_btn1:
    if st.button("Invert"):
        st.session_state.current_filter = "invert"
with col_btn2:
    if st.button("Smoothen"):
        st.session_state.current_filter = "smooth"
with col_btn2:
    if st.button("Grayscale"):
        st.session_state.current_filter = "grayscale"
with col_btn2:
    if st.button("Reset Filter"):
        st.session_state.current_filter = None
with col_btn3:
    if st.button("Download"):
        if st.session_state.filtered_image is not None:
            img = array_to_image(st.session_state.filtered_image)
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            byte_im = buf.getvalue()
            st.download_button(
                label="Download Image",
                data=byte_im,
                file_name="filtered_image.png",
                mime="image/png"
            )

# Sliders
st.subheader("Adjustments")
intensity = st.slider("Intensity", 0.0, 2.0, 1.0, 0.1)
brightness = st.slider("Brightness", -100, 100, 0, 1)
contrast = st.slider("Contrast", 0.0, 2.0, 1.0, 0.1)

# Apply filters and adjustments
if st.session_state.original_image is not None:
    filtered = st.session_state.original_image.copy()
    if "current_filter" in st.session_state and st.session_state.current_filter:
        filtered = apply_filter(filtered, st.session_state.current_filter)
    filtered = apply_adjustments(filtered, intensity, brightness, contrast)
    st.session_state.filtered_image = filtered

# Footer
st.markdown("<footer style='text-align: center; color: white; margin-top: 40px;'>Made By Yashovardhan Pratap Singh</footer>", unsafe_allow_html=True)
