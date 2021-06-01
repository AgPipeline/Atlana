
# The pixels of the plot image are now in pxarray as a numpy array
pxarray = get_image()

# Perform your calculations here
# (replace the following line with your algorithm)
value = pxarray.shape[0] * pxarray.shape[1]

# Call set_result for each calculated value
# (replace the following line with your results)
set_result('pixel count', value, 'pixels')

