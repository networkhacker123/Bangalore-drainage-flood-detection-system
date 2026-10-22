'use strict';
const RAIN_YEARS=[[1901,0.0,78.9,0.0,24.3,146.0,47.7,71.6,71.6,318.5,120.3,37.3,23.1,939.3,"Y","N"],[1902,0.7,0.0,17.0,58.1,197.8,62.2,32.0,79.5,213.6,219.9,11.1,25.4,917.3,"N","N"],[1903,0.0,0.0,0.0,1.5,63.7,109.2,27.9,189.7,475.2,171.1,233.6,29.4,1301.3,"Y","N"],[1904,0.5,0.0,0.0,14.4,241.5,49.5,149.3,53.8,126.4,157.2,0.0,1.7,794.3,"N","Y"],[1905,1.7,0.0,56.6,32.7,90.6,60.7,58.9,266.4,62.4,227.8,29.2,3.0,890.0,"N","N"],[1906,2.7,23.6,15.2,2.2,34.0,97.0,160.5,268.2,199.8,162.8,16.5,29.2,1011.7,"Y","N"],[1907,24.1,0.0,31.7,109.9,48.7,113.2,205.7,24.3,176.2,27.6,27.6,12.4,801.4,"N","N"],[1908,101.8,0.0,1.5,18.2,182.8,32.0,104.6,35.5,113.5,58.9,1.7,4.3,654.8,"N","N"],[1909,16.0,0.0,0.0,127.0,200.9,10.4,39.8,309.3,130.8,159.7,12.1,0.0,1006.0,"N","Y"],[1910,0.0,0.0,0.2,5.0,29.7,57.6,265.1,256.0,157.4,273.0,125.9,0.0,1169.9,"N","Y"],[1911,0.0,0.0,54.1,27.9,94.2,51.8,154.1,47.4,19.8,295.4,30.9,15.7,791.3,"N","Y"],[1912,0.0,4.5,39.6,1.2,36.5,96.0,105.4,148.8,476.2,150.1,36.0,0.2,1094.5,"N","N"],[1913,0.0,0.0,0.0,1.0,43.4,70.6,135.8,37.5,208.7,39.3,2.7,4.8,543.8,"N","N"],[1914,1.0,0.0,0.0,97.5,83.3,45.7,98.5,120.6,109.2,138.9,34.0,6.0,734.7,"Y","N"],[1915,14.2,0.5,49.0,40.8,117.8,167.8,91.1,57.9,243.3,81.7,84.0,7.3,955.4,"N","N"],[1916,0.0,0.0,0.0,15.4,173.9,38.1,286.5,300.4,94.4,180.8,252.2,6.3,1348.0,"N","N"],[1917,0.7,23.6,0.0,58.4,94.7,80.2,41.1,179.5,273.5,107.6,38.8,1.5,899.6,"N","Y"],[1918,20.8,7.6,9.3,30.7,199.1,41.4,18.5,133.8,128.7,26.6,147.8,40.3,804.6,"N","Y"],[1919,15.7,0.0,2.5,11.1,215.1,78.2,110.4,107.4,239.5,91.4,134.6,32.5,1038.4,"Y","N"],[1920,11.1,0.0,4.5,24.3,60.7,85.8,23.3,146.8,168.6,65.5,69.3,0.0,659.9,"N","N"],[1921,19.8,0.0,0.0,89.4,83.0,90.4,108.9,163.3,118.3,147.5,108.7,0.5,929.8,"N","N"],[1922,10.6,2.0,0.0,19.3,110.9,69.0,68.5,74.6,73.4,307.5,133.8,2.0,871.6,"N","N"],[1923,11.1,0.2,51.0,76.2,114.3,50.2,111.2,56.1,173.7,33.2,0.2,1.0,678.4,"N","N"],[1924,0.7,0.0,0.0,25.1,62.2,109.2,107.4,138.6,169.1,40.8,33.2,0.0,686.3,"N","N"],[1925,0.0,0.0,8.3,55.1,178.5,34.7,89.1,114.8,160.5,42.1,31.2,27.9,742.2,"N","Y"],[1926,28.7,0.0,10.9,97.7,46.4,60.4,86.3,65.7,245.3,148.8,1.7,0.0,791.9,"Y","N"],[1927,0.0,9.9,0.0,4.0,79.2,55.8,98.0,37.0,267.2,10.4,40.3,0.7,602.5,"N","N"],[1928,0.0,20.0,7.6,9.9,57.6,63.7,182.6,176.5,18.7,408.9,25.6,1.7,972.8,"N","N"],[1929,7.3,28.1,0.0,165.6,75.1,28.1,39.3,43.4,153.6,139.1,96.0,13.4,789.0,"N","N"],[1930,5.8,30.7,12.4,49.2,177.0,38.3,143.5,39.3,201.9,244.6,27.9,20.3,990.9,"N","N"],[1931,0.0,0.0,2.5,2.5,87.6,56.3,86.3,33.0,267.2,39.3,44.7,21.3,640.7,"Y","N"],[1932,0.0,89.9,1.0,8.1,111.2,69.0,105.9,147.0,111.5,336.8,103.1,6.6,1090.1,"N","N"],[1933,0.0,7.6,0.7,23.8,195.8,45.2,145.0,260.8,103.3,204.4,4.8,57.1,1048.5,"N","N"],[1934,7.3,0.0,7.6,90.4,64.2,85.0,33.5,67.3,8.3,232.4,26.9,5.0,627.9,"N","Y"],[1935,2.0,0.0,0.0,32.5,56.3,170.9,81.7,343.6,130.3,261.3,7.8,14.9,1101.3,"N","N"],[1936,0.0,1.0,23.8,2.2,164.5,68.3,141.9,61.4,182.6,73.6,51.5,0.0,770.8,"N","N"],[1937,1.2,45.9,20.0,162.0,113.7,77.2,95.5,82.8,76.2,96.7,39.3,19.0,829.5,"N","N"],[1938,0.0,2.2,5.5,15.2,59.4,67.3,138.4,307.5,173.2,29.2,1.5,0.0,799.4,"N","N"],[1939,14.9,0.0,10.1,156.2,50.8,84.3,59.4,90.1,165.6,192.7,71.1,0.0,895.2,"N","Y"],[1940,0.0,0.0,2.0,42.1,193.5,119.3,40.3,80.5,123.4,150.3,162.5,15.2,929.1,"N","N"],[1941,4.0,0.0,0.0,81.5,90.1,97.5,86.3,79.7,132.5,167.8,36.3,85.5,861.2,"Y","N"],[1942,0.0,0.0,0.0,18.2,65.0,98.8,52.3,160.2,153.6,81.5,156.7,42.9,829.2,"Y","N"],[1943,18.5,0.0,1.0,116.8,184.9,40.1,156.4,110.4,165.1,383.0,63.2,1.0,1240.4,"N","Y"],[1944,0.0,62.9,71.8,40.8,59.4,93.4,140.9,151.6,168.9,160.2,51.3,8.1,1009.3,"N","N"],[1945,0.0,0.0,0.0,25.9,116.5,4.5,110.2,150.1,102.8,60.4,17.0,0.0,587.4,"N","N"],[1946,0.2,0.0,8.6,26.6,134.6,9.3,134.6,156.4,226.8,129.7,159.0,55.8,1041.6,"N","N"],[1947,3.3,0.0,1.5,8.1,64.0,109.7,165.6,226.8,95.7,206.7,22.3,6.6,910.3,"N","N"],[1948,10.6,0.0,0.0,25.9,159.2,132.0,148.5,285.4,60.4,136.3,37.8,5.0,1001.1,"N","N"],[1949,0.0,7.8,0.0,39.8,47.2,94.2,350.2,165.6,102.3,260.3,2.5,0.0,1069.9,"N","N"],[1950,0.0,2.0,0.0,2.5,100.0,27.1,71.3,132.3,106.1,181.3,178.8,0.0,801.4,"N","Y"],[1951,0.0,0.0,0.8,11.2,169.7,56.6,172.2,48.5,266.7,122.7,56.1,0.0,904.5,"N","Y"],[1952,0.0,10.9,0.0,5.0,92.7,93.4,124.4,154.1,75.1,178.3,0.0,77.7,811.6,"N","N"],[1953,0.0,4.5,0.0,143.7,50.8,73.6,177.2,43.9,199.3,503.6,5.0,0.0,1201.6,"N","N"],[1954,14.2,0.0,1.2,11.1,159.7,74.9,202.4,155.9,25.1,192.0,0.0,36.3,872.8,"N","N"],[1955,8.3,0.0,0.0,92.7,118.8,66.2,98.8,161.0,104.1,132.5,6.3,6.6,795.3,"N","Y"],[1956,3.3,0.0,0.0,44.1,20.3,90.9,112.0,73.1,189.4,522.2,56.1,9.6,1121.0,"N","Y"],[1957,0.0,0.0,19.8,22.9,287.0,117.1,27.8,50.6,55.2,151.3,31.1,0.0,762.8,"N","N"],[1958,10.2,0.0,3.8,102.6,225.9,89.4,80.7,287.9,227.4,167.3,81.9,6.2,1283.3,"Y","N"],[1959,0.0,71.5,0.0,12.9,109.0,134.1,52.1,253.4,265.0,28.7,39.2,3.7,969.6,"N","N"],[1960,0.0,0.0,0.6,2.3,142.7,56.4,103.8,90.7,216.5,163.6,113.5,0.4,890.5,"N","N"],[1961,4.6,2.8,0.6,65.2,150.5,71.6,93.4,115.7,149.5,181.5,43.1,2.9,881.4,"N","N"],[1962,0.9,8.3,18.6,122.5,120.7,77.0,45.7,129.7,188.7,241.7,7.4,92.2,1053.4,"N","Y"],[1963,16.6,0.0,7.6,106.5,98.4,93.7,23.3,203.3,180.6,260.7,31.3,14.8,1036.8,"N","N"],[1964,0.0,0.0,0.0,10.0,80.4,82.6,285.6,105.7,287.7,141.5,189.8,8.3,1191.6,"N","N"],[1965,0.0,0.0,0.0,31.2,27.3,56.4,60.1,357.1,55.1,3.2,46.0,55.6,692.0,"N","N"],[1966,0.0,0.0,0.4,38.2,131.5,61.8,125.4,86.6,314.1,184.6,235.7,27.8,1206.1,"Y","N"],[1967,22.7,0.0,11.3,3.7,71.4,81.6,199.9,93.0,66.4,128.5,51.0,30.9,760.4,"N","N"],[1968,0.0,5.8,6.0,30.0,96.5,127.9,53.9,65.8,333.7,119.5,17.8,11.7,868.6,"N","N"],[1969,0.0,0.0,1.6,121.7,165.2,55.9,76.4,187.5,85.7,191.5,192.3,119.2,1197.0,"N","N"],[1970,0.0,14.6,1.5,17.2,161.9,119.5,122.2,135.6,135.7,281.7,33.4,1.0,1024.3,"N","N"],[1971,0.0,4.6,0.2,61.3,179.2,23.6,54.6,212.7,241.0,124.7,19.1,24.3,945.3,"N","Y"],[1972,0.2,0.0,0.0,17.7,112.1,83.5,48.1,61.4,213.4,211.8,35.0,73.7,856.9,"N","N"],[1973,0.0,0.0,0.0,4.8,54.5,71.7,90.3,158.6,331.1,194.1,22.4,22.8,950.3,"Y","N"],[1974,0.0,0.0,0.0,27.9,156.7,23.0,138.1,81.2,394.5,116.3,13.0,0.0,950.7,"N","Y"],[1975,0.0,9.8,0.4,1.1,74.5,99.0,246.3,140.2,161.9,181.8,133.3,10.7,1059.0,"N","N"],[1976,0.0,0.0,0.0,110.0,59.0,20.7,70.9,181.7,86.6,67.1,159.6,1.8,757.4,"N","Y"],[1977,0.0,1.1,40.6,94.1,144.4,118.7,87.7,103.3,90.5,234.5,88.9,0.0,1003.8,"N","N"],[1978,0.0,26.9,1.4,40.8,93.8,46.6,120.9,96.1,210.1,84.9,82.7,25.7,829.9,"Y","N"],[1979,0.0,53.9,0.8,27.0,77.8,197.5,74.3,64.3,466.5,161.8,105.4,0.0,1229.3,"N","N"],[1980,0.0,0.0,10.9,7.2,151.7,41.8,112.7,114.5,213.0,78.0,51.6,0.0,781.4,"Y","N"],[1981,1.5,0.0,101.2,9.6,119.4,16.9,154.1,123.8,204.0,86.6,16.9,21.7,855.7,"N","N"],[1982,0.0,0.0,1.1,16.1,100.2,144.1,46.9,81.0,206.5,139.4,23.9,1.2,760.4,"N","N"],[1983,0.0,0.0,0.0,0.0,106.5,218.4,64.2,178.5,275.8,53.7,2.9,69.8,969.8,"Y","N"],[1984,0.7,33.4,91.7,42.7,60.2,25.3,142.8,45.0,243.6,144.5,10.7,10.9,851.5,"N","N"],[1985,2.8,0.0,20.7,10.0,73.6,75.4,72.9,67.8,139.8,70.9,97.1,3.0,634.0,"N","N"],[1986,18.6,16.4,0.0,8.4,85.4,131.7,65.3,97.5,516.6,102.6,87.9,14.7,1145.1,"N","N"],[1987,0.0,0.0,25.3,57.6,84.2,84.2,53.7,157.8,102.7,144.4,35.1,53.6,798.6,"Y","N"],[1988,0.0,0.0,29.2,71.4,108.9,25.7,243.8,242.0,424.6,10.0,35.4,30.0,1221.0,"Y","N"],[1989,0.0,0.0,2.0,6.2,88.9,47.9,208.9,67.0,235.5,238.6,6.6,3.5,905.1,"N","Y"],[1990,1.2,0.0,3.4,32.2,146.9,57.2,36.6,109.0,98.6,91.0,26.2,10.8,613.1,"N","N"],[1991,0.3,0.0,0.0,43.3,194.4,209.4,72.5,119.4,227.7,303.0,180.5,0.0,1350.5,"N","N"],[1992,0.0,0.0,0.0,7.6,91.0,178.1,93.8,104.6,154.8,159.8,36.2,0.4,826.3,"Y","N"],[1993,0.0,0.0,29.5,38.8,100.9,140.3,92.9,127.6,263.5,165.5,27.3,82.7,1069.0,"N","N"],[1994,0.0,0.2,0.0,11.0,78.5,38.7,107.5,58.6,80.6,180.6,25.6,5.9,587.2,"N","N"],[1995,18.5,0.0,16.5,33.8,147.7,95.6,107.2,229.3,251.6,155.1,13.1,0.0,1068.4,"Y","N"],[1996,0.0,0.0,0.0,90.8,117.6,228.0,51.0,302.9,275.8,83.8,1.2,21.8,1172.9,"N","N"],[1997,5.4,0.0,26.7,65.2,77.0,78.8,25.6,161.7,277.0,328.5,164.4,19.5,1229.8,"N","N"],[1998,0.0,0.0,0.1,95.0,110.3,60.7,257.7,387.1,235.3,215.4,49.6,20.6,1431.8,"Y","N"],[1999,0.0,15.7,0.0,74.9,200.6,75.7,114.4,94.7,164.2,192.4,64.8,16.6,1014.0,"N","Y"],[2000,0.0,57.7,0.0,76.2,56.6,91.8,115.9,276.7,208.8,286.2,8.9,15.1,1193.9,"N","Y"],[2001,0.6,0.0,2.2,323.8,60.2,27.4,112.1,85.1,248.6,155.9,35.0,7.6,1058.5,"N","N"],[2002,0.0,0.7,0.0,8.8,183.5,180.9,36.8,45.5,94.8,173.9,38.0,9.1,772.0,"N","N"],[2003,0.0,1.8,3.3,84.1,1.3,86.0,96.2,139.2,44.1,192.7,27.4,2.6,678.7,"Y","N"],[2004,5.4,1.2,5.5,47.5,205.3,75.7,210.4,65.2,186.9,197.3,25.7,0.0,1026.1,"N","N"],[2005,1.6,4.4,13.4,75.1,115.7,127.9,136.4,194.0,173.5,446.0,56.5,6.3,1350.8,"N","N"],[2006,0.3,0.0,62.7,25.2,133.9,190.5,53.6,44.2,31.5,48.9,48.0,0.3,639.1,"N","N"],[2007,0.0,0.2,0.0,104.9,79.5,57.2,154.0,146.5,223.7,163.0,21.1,34.5,984.6,"Y","N"],[2008,0.1,9.9,115.4,30.4,87.1,59.2,182.5,247.4,105.6,210.9,47.6,0.3,1096.4,"N","N"],[2009,0.1,0.0,15.2,63.9,123.8,125.4,30.2,162.2,335.3,35.2,66.8,17.5,975.6,"N","N"],[2010,5.4,0.0,17.4,97.5,123.9,67.3,112.3,121.1,149.9,95.8,166.8,2.7,960.1,"Y","N"],[2011,0.0,44.1,0.2,210.3,150.5,57.7,92.8,278.2,111.1,170.0,49.9,7.2,1172.0,"N","Y"],[2012,0.4,0.0,0.7,14.0,143.6,7.2,66.7,189.1,68.4,83.2,125.0,26.9,725.2,"N","Y"],[2013,0.0,2.9,0.6,23.0,151.0,177.1,139.7,94.3,352.6,100.2,143.7,0.3,1185.4,"N","N"],[2014,0.0,0.2,4.7,22.7,74.6,172.0,100.9,102.4,319.0,343.8,25.7,1.0,1167.0,"N","N"],[2015,9.0,0.0,37.7,225.8,178.4,85.3,94.1,110.0,189.8,47.0,296.4,5.1,1278.6,"N","N"],[2016,4.4,0.0,19.9,21.9,140.6,191.3,209.4,82.8,33.2,11.5,1.5,74.9,791.4,"Y","N"],[2017,0.2,0.0,47.8,30.4,241.9,25.1,59.0,351.8,513.8,385.7,20.6,19.7,1696.0,"N","N"],[2018,0.0,1.8,47.6,34.1,140.4,29.5,94.2,70.9,106.9,63.3,12.8,16.2,617.7,"N","N"],[2019,0.8,58.0,0.0,41.2,136.7,58.4,93.9,142.8,211.4,196.3,8.0,12.6,960.1,"N","N"],[2020,0.0,0.0,18.4,121.1,128.6,114.8,158.3,75.9,300.0,204.3,71.0,20.4,1212.8,"N","N"],[2021,21.2,10.3,0.0,118.2,130.7,91.1,203.3,98.3,188.5,366.3,277.8,5.4,1511.1,"N","Y"],[2022,3.9,0.0,0.0,61.4,270.2,255.5,136.7,378.7,353.0,296.5,59.8,74.7,1957.7,"N","Y"],[2023,0.0,0.0,8.4,28.2,305.5,72.3,141.5,12.6,248.4,96.0,106.6,0.7,1020.2,"Y","N"],[2024,0.0,0.0,0.0,0.0,180.9,204.7,92.8,230.2,23.9,306.2,21.6,93.7,1154.0,"Y","Y"],[2025,5.2,0.0,11.8,32.3,315.0,58.0,87.5,161.8,242.0,127.9,2.3,1.2,1045.0,"Y","Y"]];
const RAIN_LPA={"LPA (1991-2020)":[1.7,5.9,19.2,73.0,133.0,111.0,112.8,160.2,198.4,180.7,63.4,14.8,1077.1],"LPA (1981-2010)":[1.9,5.2,18.0,55.7,112.6,104.3,116.2,149.4,213.8,166.7,48.5,16.8,986.1]};
const WARD_LAKES=[[1,"Kempegowda Ward",2,1441486],[2,"Chowdeswari Ward",2,416208],[3,"Atturu",2,307428],[4,"Yelahanka Satellite Town",2,172663],[5,"Jakkuru",10,1283652],[6,"Thanisandra",1,444273],[7,"Byatarayanapura",2,308438],[8,"Kodigehalli",1,545611],[9,"Vidyaranyapura",2,74162],[10,"Dodda Bommasandra",1,446760],[11,"Kuvempu Nagar",1,238723],[12,"Shettihalli",2,238123],[13,"Mallasandra",1,46615],[14,"Bagalakunte",0,0],[15,"T Dasarahalli",0,0],[16,"Jalahalli",0,0],[17,"J P Park",1,302001],[18,"Radhakrishna Temple Ward",1,80474],[19,"Sanjaya Nagar",0,0],[20,"Ganga Nagar",0,0],[21,"Hebbala",0,0],[22,"Vishwanath Nagenahalli",0,0],[23,"Nagavara",0,0],[24,"HBR Layout",1,91057],[25,"Horamavu",5,972443],[26,"Ramamurthy Nagar",0,0],[27,"Banasavadi",1,79263],[28,"Kammanahalli",2,79942],[29,"Kacharkanahalli",0,0],[30,"Kadugondanahalli",0,0],[31,"Kushal Nagar",0,0],[32,"Kaval Bairasandra",0,0],[33,"Manorayana Palya",0,0],[34,"Gangenahalli",0,0],[35,"Aramane Nagara",1,138784],[36,"Mattikere",0,0],[37,"Yeshwanthpura",0,0],[38,"HMT Ward",0,0],[39,"Chokkasandra",1,63616],[40,"Dodda Bidarakallu",3,227210],[41,"Peenya Industrial Area",2,269105],[42,"Lakshmi Devi Nagar",0,0],[43,"Nandini Layout",0,0],[44,"Marappana Palya",0,0],[45,"Malleshwaram",0,0],[46,"Jayachamarajendra Nagar",0,0],[47,"Devara Jeevanahalli",0,0],[48,"Muneshwara Nagar",0,0],[49,"Lingarajapura",0,0],[50,"Benniganahalli",1,28748],[51,"Vijnanapura",0,0],[52,"KR Puram",3,332124],[53,"Basavanapura",3,206069],[54,"Hudi",3,296464],[55,"Devasandra",4,138527],[56,"A Narayanapura",2,141307],[57,"C.V. Raman Nagar",1,143548],[58,"New Tippa Sandra",1,28811],[59,"Maruthi Seva Nagar",1,46330],[60,"Sagayara Puram",0,0],[61,"SK Garden",0,0],[62,"Ramaswamy Palya",0,0],[63,"Jaya Mahal",0,0],[64,"Raj Mahal Guttahalli",0,0],[65,"Kadu Malleshwar Ward",0,0],[66,"Subramanya Nagar",0,0],[67,"Nagapura",0,0],[68,"Mahalakshmipuram",0,0],[69,"Laggere",0,0],[70,"Rajagopal Nagar",0,0],[71,"Hegganahalli",0,0],[72,"Herohalli",3,362593],[73,"Kottegepalya",1,12508],[74,"Shakthi Ganapathi Nagar",1,35048],[75,"Shankar Matt",0,0],[76,"Gayithri Nagar",0,0],[77,"Dattatreya Temple Ward",0,0],[78,"Pulakeshi Nagar",0,0],[79,"Sarvagna Nagar",1,58784],[80,"Hoysala Nagar",0,0],[81,"Vijnana Nagar",2,246964],[82,"Garudachar palya",4,193053],[83,"Kadugodi",1,40073],[84,"Hagadur",3,250263],[85,"Dodda Nekkundi",5,695188],[86,"Marathahalli",0,0],[87,"HAL Airport",0,0],[88,"Jeevanbhima Nagar",0,0],[89,"Jogupalya",0,0],[90,"Halsoor",1,438884],[91,"Bharathi Nagar",0,0],[92,"Shivaji Nagar",0,0],[93,"Vasanth Nagar",0,0],[94,"Gandhi Nagar",0,0],[95,"Subhash Nagar",0,0],[96,"Okalipuram",0,0],[97,"Dayananda Nagar",0,0],[98,"Prakash Nagar",0,0],[99,"Rajaji Nagar",0,0],[100,"Basaveshwara Nagar",1,62606],[101,"Kamakshipalya",1,11822],[102,"Vrisahbhavathi Nagar",0,0],[103,"Kaveripura",1,23481],[104,"Govindaraja Nagar",0,0],[105,"Agrahara Dasarahalli",0,0],[106,"Dr.Raj Kumar Ward",0,0],[107,"Shiva Nagar",0,0],[108,"Sri Rama Mandir Ward",0,0],[109,"Chickpete",0,0],[110,"Sampangiram Nagar",0,0],[111,"Shantala Nagar",0,0],[112,"Domlur",0,0],[113,"Konena Agrahara",1,34340],[114,"Agaram",0,0],[115,"Vannar Pet",0,0],[116,"Nilasandra",0,0],[117,"Shanthi Nagar",0,0],[118,"Sudham Nagar",0,0],[119,"Dharmaraya Swamy Temple",0,0],[120,"Cottonpete",0,0],[121,"Binni Pete",0,0],[122,"Kempapura Agrahara",0,0],[123,"Vijaya Nagar",0,0],[124,"Hosahalli",0,0],[125,"Marenahalli",0,0],[126,"Maruthi Mandir Ward",0,0],[127,"Mudalapalya",0,0],[128,"Nagarabhavi",0,0],[129,"Jnana Bharathi Ward",1,26961],[130,"Ullalu",3,322706],[131,"Nayandahalli",1,50838],[132,"Attiguppe",0,0],[133,"Hampi Nagar",0,0],[134,"Bapuji Nagar",0,0],[135,"Padarayanapura",0,0],[136,"Jagajivanaram Nagar",0,0],[137,"Rayapuram",0,0],[138,"Chelavadi Palya",0,0],[139,"KR Market",0,0],[140,"Chamraja Pet",0,0],[141,"Azad Nagar",0,0],[142,"Sunkenahalli",0,0],[143,"Vishveshwara Puram",0,0],[144,"Siddapura",0,0],[145,"Hombegowda Nagar",0,0],[146,"Lakkasandra",0,0],[147,"Adugodi",0,0],[148,"Ejipura",0,0],[149,"Varthur",7,2380141],[150,"Bellanduru",11,4254612],[151,"Koramangala",1,39421],[152,"Suddagunte Palya",1,34894],[153,"Jaya Nagar",1,47634],[154,"Basavanagudi",0,0],[155,"Hanumanth Nagar",1,142074],[156,"Sri Nagar",0,0],[157,"Gali Anjenaya Temple Ward",0,0],[158,"Deepanjali Nagar",1,14831],[159,"Kengeri",1,100808],[160,"Raja Rajeshawari Nagar",6,372956],[161,"Hosakerehalli",0,0],[162,"Giri Nagar",0,0],[163,"Katriguppe",0,0],[164,"Vidya Peeta Ward",0,0],[165,"Ganesh Mandir Ward",0,0],[166,"Kari Sandra",1,64024],[167,"Yediyur",1,48006],[168,"Pattabhi Ram Nagar",0,0],[169,"Byra Sandra",0,0],[170,"Jaya Nagar East",0,0],[171,"Gurappana Palya",0,0],[172,"Madivala",0,0],[173,"Jakka Sandra",0,0],[174,"HSR Layout",2,437845],[175,"Bommanahalli",0,0],[176,"BTM Layout",0,0],[177,"JP Nagar",1,193938],[178,"Sarakki",0,0],[179,"Shakambari Narar",0,0],[180,"Banashankari Temple Ward",0,0],[181,"Kumara Swamy Layout",0,0],[182,"Padmanabha Nagar",2,37449],[183,"Chikkala Sandra",1,21469],[184,"Uttarahalli",5,239386],[185,"Yelchenahalli",2,37519],[186,"Jaraganahalli",1,278640],[187,"Puttenahalli",1,38415],[188,"Bilekhalli",2,1017126],[189,"Honga Sandra",0,0],[190,"Mangammana Palya",3,144197],[191,"Singa Sandra",6,381818],[192,"Begur",12,916699],[193,"Arakere",3,566818],[194,"Gottigere",3,208118],[195,"Konankunte",1,58062],[196,"Anjanapura",3,140237],[197,"Vasanthpura",5,133549],[198,"Hemmigepura",10,502342]];

/* =====================================================================
   DrainSight — AI Drain-Blockage & Flood Detection
   Data provenance:
   • RAIN_YEARS / RAIN_LPA  — REAL. Monthly Bengaluru rainfall 1901–2025 (mm)
                              + IMD long-period averages. From uploaded record.
   • WARD_LAKES             — REAL. BBMP ward-wise lake inventory (count, area m²).
   • Lake coordinates, valley spines, hotspots — APPROXIMATE real geography
                              (the three Bengaluru valleys: Hebbal, Koramangala–
                              Challaghatta, Vrishabhavathi; widely-reported flood
                              points). Coordinates are hand-placed, not surveyed.
   • Live rainfall, drain capacities, water depths, simulation & RL outputs —
                              MODEL / ILLUSTRATIVE. Clearly badged in the UI.
   See the "Data & Methods" tab for the full source map and API hook points.
   ===================================================================== */
'use strict';
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const fmt = n => n.toLocaleString('en-IN');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---- Bengaluru real-ish geography ---- */
const BLR = {lat:12.9716, lng:77.5946, zoom:11};

// Major lakes (approx real coordinates). area_ha illustrative-rounded from inventory where known.
const LAKES = [
  {n:"Bellandur Lake", ll:[12.9304,77.6784], r:760, valley:"KC", full:88, n2:"Largest lake; chronic froth & overflow"},
  {n:"Varthur Lake", ll:[12.9417,77.7406], r:560, valley:"KC", full:90, n2:"Downstream of Bellandur"},
  {n:"Hebbal Lake", ll:[13.0480,77.5910], r:300, valley:"HV", full:72, n2:"Head of Hebbal valley"},
  {n:"Ulsoor Lake", ll:[12.9820,77.6200], r:230, valley:"KC", full:66},
  {n:"Sankey Tank", ll:[13.0073,77.5713], r:150, valley:"VV", full:58},
  {n:"Madivala Lake", ll:[12.9180,77.6190], r:330, valley:"KC", full:80},
  {n:"Agara Lake", ll:[12.9226,77.6420], r:230, valley:"KC", full:76},
  {n:"Jakkur Lake", ll:[13.0720,77.6050], r:280, valley:"HV", full:60},
  {n:"Yelahanka Lake", ll:[13.1010,77.5960], r:240, valley:"HV", full:55},
  {n:"Sarakki Lake", ll:[12.8930,77.5760], r:170, valley:"VV", full:64},
  {n:"Rachenahalli Lake", ll:[13.0640,77.6230], r:200, valley:"HV", full:68},
  {n:"Nagavara Lake", ll:[13.0440,77.6230], r:210, valley:"HV", full:71},
  {n:"Kaikondrahalli Lake", ll:[12.9180,77.6790], r:150, valley:"KC", full:62},
  {n:"Hoskerehalli Lake", ll:[12.9290,77.5460], r:140, valley:"VV", full:59},
  {n:"Hulimavu Lake", ll:[12.8780,77.6010], r:160, valley:"VV", full:67},
];

// Three valley spines (approx). Drains flow generally toward each valley axis.
const VALLEYS = {
  HV:{name:"Hebbal Valley", color:"#3E6E8E", spine:[[13.10,77.57],[13.07,77.60],[13.048,77.591],[13.044,77.623],[13.02,77.66],[13.00,77.70]]},
  KC:{name:"Koramangala–Challaghatta Valley", color:"#2F6F7C", spine:[[12.98,77.60],[12.95,77.62],[12.93,77.66],[12.9304,77.6784],[12.9417,77.7406],[12.92,77.78]]},
  VV:{name:"Vrishabhavathi Valley", color:"#5B7B5B", spine:[[13.01,77.55],[12.97,77.53],[12.94,77.52],[12.90,77.51],[12.86,77.50]]},
};

// Neighborhoods / focus areas with baseline flood attributes (approx real coords; attributes illustrative)
const AREAS = [
  {k:"Bellandur",   ll:[12.9260,77.6762], valley:"KC", elev:0.18, imperv:0.82, drainKm:14, hot:1, roads:["Outer Ring Rd (Bellandur)","Sarjapur Rd","Devarabisanahalli"]},
  {k:"Varthur",     ll:[12.9417,77.7406], valley:"KC", elev:0.16, imperv:0.74, drainKm:11, hot:1, roads:["Varthur Main Rd","Gunjur Rd","Whitefield–Varthur"]},
  {k:"Mahadevapura",ll:[12.9890,77.6870], valley:"KC", elev:0.30, imperv:0.86, drainKm:16, hot:1, roads:["ITPL Main Rd","Mahadevapura junction","Hoodi"]},
  {k:"Yelahanka",   ll:[13.1007,77.5963], valley:"HV", elev:0.62, imperv:0.55, drainKm:12, hot:0, roads:["Yelahanka New Town","Doddaballapur Rd"]},
  {k:"Koramangala", ll:[12.9352,77.6245], valley:"KC", elev:0.34, imperv:0.88, drainKm:13, hot:1, roads:["Koramangala 80 Ft Rd","Sony World Jn","Adugodi"]},
  {k:"HSR Layout",  ll:[12.9116,77.6474], valley:"KC", elev:0.28, imperv:0.83, drainKm:12, hot:1, roads:["HSR 27th Main","Agara jn","Sector 2"]},
  {k:"Silk Board",  ll:[12.9170,77.6228], valley:"KC", elev:0.22, imperv:0.90, drainKm:9,  hot:1, roads:["Silk Board jn","BTM ORR","Madivala"]},
  {k:"Bommanahalli",ll:[12.9080,77.6190], valley:"KC", elev:0.24, imperv:0.85, drainKm:10, hot:1, roads:["Hosur Rd","Bommanahalli jn","Garvebhavipalya"]},
  {k:"Manyata",     ll:[13.0440,77.6200], valley:"HV", elev:0.40, imperv:0.84, drainKm:11, hot:1, roads:["Nagavara ORR","Manyata Tech Park","Hebbal–Nagavara"]},
  {k:"KR Puram",    ll:[13.0070,77.6960], valley:"KC", elev:0.26, imperv:0.80, drainKm:13, hot:1, roads:["KR Puram bridge","Tin Factory","Old Madras Rd"]},
  {k:"Whitefield",  ll:[12.9698,77.7500], valley:"KC", elev:0.46, imperv:0.78, drainKm:15, hot:0, roads:["Whitefield Main Rd","Graphite India jn","Kundalahalli"]},
  {k:"Hebbal",      ll:[13.0358,77.5970], valley:"HV", elev:0.50, imperv:0.80, drainKm:10, hot:1, roads:["Hebbal flyover","Bellary Rd","Veterinary College"]},
  {k:"Indiranagar", ll:[12.9719,77.6412], valley:"KC", elev:0.52, imperv:0.86, drainKm:9,  hot:0, roads:["100 Ft Rd","CMH Rd","Old Airport Rd"]},
  {k:"Jayanagar",   ll:[12.9250,77.5938], valley:"VV", elev:0.58, imperv:0.82, drainKm:10, hot:0, roads:["Jayanagar 4th Block","South End Circle","Tilaknagar"]},
];

// Chronic flood hotspots (widely reported). depth_typ in cm during severe events — illustrative.
const HOTSPOTS = [
  {n:"Silk Board Junction", ll:[12.9170,77.6228], depth:55, cause:"Drain undersized at ORR merge"},
  {n:"KR Puram / Tin Factory", ll:[13.0070,77.6960], depth:60, cause:"Backflow + bridge bottleneck"},
  {n:"Sony World Junction", ll:[12.9352,77.6245], depth:45, cause:"Low point, encroached SWD"},
  {n:"Sai Layout, Horamavu", ll:[13.0290,77.6660], depth:90, cause:"Lake series overflow, encroachment"},
  {n:"Yemalur (ORR)", ll:[12.9430,77.6680], depth:50, cause:"Bellandur backwater"},
  {n:"Rainbow Drive, Sarjapur", ll:[12.9020,77.6960], depth:80, cause:"Lake breach, valley low point"},
  {n:"Hebbal Flyover", ll:[13.0358,77.5970], depth:40, cause:"Culvert under-capacity"},
  {n:"Hosakerehalli", ll:[12.9290,77.5460], depth:45, cause:"Vrishabhavathi spill"},
];

// Underpasses (real names; status illustrative)
const UNDERPASSES = [
  {n:"K R Circle UP", ll:[12.9760,77.5870]},
  {n:"Okalipuram UP", ll:[12.9810,77.5660]},
  {n:"Sirsi Circle UP", ll:[12.9610,77.5730]},
  {n:"Lottegollahalli UP", ll:[13.0290,77.5810]},
  {n:"Cantonment RUB", ll:[12.9930,77.5890]},
];

/* Major Bengaluru roads (approx real arterial paths). `flood` flags chronically
   waterlogged stretches. */
const ROADS=[
 {n:"Outer Ring Road (ORR)", hwy:1, flood:1, path:[[13.0350,77.5910],[13.0440,77.6220],[13.0070,77.6960],[12.9560,77.7010],[12.9260,77.6760],[12.9170,77.6228],[12.9120,77.6010],[12.9230,77.5560],[12.9450,77.5190],[12.9960,77.5230],[13.0280,77.5370],[13.0350,77.5910]]},
 {n:"Hosur Road (NH 44)", hwy:1, flood:1, path:[[12.9620,77.5990],[12.9350,77.6100],[12.9170,77.6228],[12.9050,77.6200],[12.8650,77.6480],[12.8450,77.6620]]},
 {n:"Bellary Road / Airport Road (NH 44)", hwy:1, flood:1, path:[[12.9820,77.5900],[13.0130,77.5850],[13.0350,77.5910],[13.0700,77.5950],[13.1010,77.5963],[13.1350,77.6300]]},
 {n:"Old Madras Road (NH 75)", hwy:1, flood:1, path:[[12.9850,77.6200],[12.9780,77.6412],[12.9930,77.6680],[13.0070,77.6960],[12.9920,77.7300]]},
 {n:"Sarjapur Road", hwy:0, flood:1, path:[[12.9352,77.6245],[12.9210,77.6390],[12.9116,77.6474],[12.9260,77.6760],[12.9100,77.7100],[12.9020,77.6960]]},
 {n:"Tumakuru Road (NH 48)", hwy:1, flood:0, path:[[12.9900,77.5720],[13.0280,77.5370],[13.0320,77.5100],[13.0420,77.4750]]},
 {n:"Mysuru Road", hwy:1, flood:0, path:[[12.9570,77.5700],[12.9500,77.5250],[12.9180,77.4900],[12.9070,77.4830]]},
 {n:"Kanakapura Road", hwy:0, flood:0, path:[[12.9400,77.5700],[12.9250,77.5460],[12.9000,77.5560],[12.8650,77.5440]]},
 {n:"Magadi Road", hwy:0, flood:0, path:[[12.9760,77.5720],[12.9750,77.5300],[12.9700,77.4900]]},
 {n:"Whitefield Main Road", hwy:0, flood:1, path:[[12.9920,77.7300],[12.9698,77.7500],[12.9550,77.7400]]},
 {n:"Old Airport Road / HAL", hwy:0, flood:0, path:[[12.9719,77.6412],[12.9600,77.6600],[12.9580,77.6800]]},
 {n:"100 Ft Road, Indiranagar", hwy:0, flood:0, path:[[12.9780,77.6412],[12.9700,77.6410],[12.9620,77.6400]]},
];
/* Namma Metro lines (approx) */
const METRO=[
 {n:"Purple Line", col:"#7A4F9E", path:[[12.9970,77.7500],[13.0070,77.6960],[12.9780,77.6412],[12.9750,77.6060],[12.9760,77.5720],[12.9700,77.5400],[12.9100,77.4850],[12.9000,77.4700]]},
 {n:"Green Line",  col:"#2E8B57", path:[[13.0480,77.5000],[13.0300,77.5120],[13.0280,77.5530],[12.9760,77.5720],[12.9620,77.5740],[12.9450,77.5730],[12.9280,77.5800],[12.8650,77.5450]]},
];
function mulberry(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

/* Dendritic (tree-like) drainage network — a recursive river/drain generator
   rooted at each valley outlet and grown upstream into the catchment, so every
   tributary connects to a trunk. Emulates the real BBMP/Karnataka drainage map:
   thick primary drains (high Strahler order) fed by ever-finer storm-water drains. */
const NET_CENTER=[12.9716,77.5946];
function inCity(p){const dx=(p[1]-NET_CENTER[1])/0.27,dy=(p[0]-NET_CENTER[0])/0.23;return dx*dx+dy*dy<1;}
const TRUNKS=[ // [outletLat,outletLng, angleTowardCity(rad), startLen, order, valleyKey]
 [13.105,77.605,-1.45,0.050,7,'HV'],[13.085,77.585,-1.60,0.044,6,'HV'],
 [12.880,77.790, 2.55,0.052,7,'KC'],[12.905,77.760, 2.70,0.046,7,'KC'],[12.930,77.730, 2.90,0.040,6,'KC'],
 [12.840,77.470, 0.75,0.050,7,'VV'],[12.870,77.500, 0.95,0.044,6,'VV'],[12.820,77.560, 1.30,0.040,6,'VV'],
];
function buildDrains(){
  const rng=mulberry(7);const segs=[];let n=0;
  function grow(p,ang,len,order,vk){
    if(order<=0||n>4200)return;
    const np=[p[0]+Math.sin(ang)*len, p[1]+Math.cos(ang)*len];
    segs.push({pts:[p,np],order,valley:vk,
      kind:order>=5?'primary':order>=2?'secondary':'tertiary'});
    n++;
    if(!inCity(np)&&order<5)return;
    grow(np,ang+(rng()-0.5)*0.45,len*0.84,order-1,vk);          // main continuation
    let nb=order>=5?2:order>=3?(rng()<0.85?2:1):(rng()<0.45?1:0); // tributaries
    for(let i=0;i<nb;i++){const side=i%2===0?1:-1;
      grow(np,ang+(0.45+rng()*0.55)*side,len*(0.58+rng()*0.22),order-1,vk);}
  }
  TRUNKS.forEach(t=>grow([t[0],t[1]],t[2],t[3],t[4],t[5]));
  return segs;
}
/* Prefer the Python-generated, decluttered major-drain network (≈360 segments).
   Falls back to the full in-browser generator only if data_generated.js is absent. */
const DRAINS = (typeof DRAINS_MAJOR !== 'undefined' && DRAINS_MAJOR.length)
  ? DRAINS_MAJOR
  : buildDrains();


/* Encroached / blocked drain zones (illustrative points along network) */
const BLOCKED = [
  {n:"Encroached SWD — Rainbow Drive", ll:[12.9020,77.6960], sev:"Severe"},
  {n:"Silt + debris — Koramangala 3rd Blk", ll:[12.9320,77.6280], sev:"Partial"},
  {n:"Encroachment — Sai Layout", ll:[13.0290,77.6660], sev:"Severe"},
  {n:"Blocked culvert — Hebbal", ll:[13.0358,77.5970], sev:"Severe"},
  {n:"Debris — HSR Agara", ll:[12.9116,77.6474], sev:"Partial"},
  {n:"Encroachment — Bellandur outfall", ll:[12.9304,77.6784], sev:"Severe"},
  {n:"Silt — Vrishabhavathi", ll:[12.9290,77.5460], sev:"Partial"},
];
/* Recharge wells / points (illustrative) */
const RECHARGE = (()=>{const rng=mulberry(7);const a=[];for(let i=0;i<26;i++){
  a.push([BLR.lat-0.13+rng()*0.27, BLR.lng-0.15+rng()*0.31]);}return a;})();
/* Low-lying depressions (rough polygons around chronic low points) */
function lowPoly(c,rx,ry){const rng=mulberry(c[0]*1000|0);const p=[];for(let a=0;a<360;a+=30){
  const r=0.8+rng()*0.4;p.push([c[0]+Math.sin(a*Math.PI/180)*ry*r, c[1]+Math.cos(a*Math.PI/180)*rx*r]);}return p;}
const LOWLYING=[
  lowPoly([12.918,77.625],0.012,0.010), // silk board / madivala
  lowPoly([12.930,77.678],0.016,0.013), // bellandur basin
  lowPoly([13.007,77.696],0.013,0.011), // kr puram
  lowPoly([13.029,77.666],0.010,0.009), // sai layout
  lowPoly([12.902,77.696],0.011,0.010), // rainbow drive
];
/* High-density built-up footprints (rough) */
const BUILTUP=[
  {c:[12.97,77.64],r:0.030,n:"Indiranagar–Domlur core"},
  {c:[12.935,77.625],r:0.026,n:"Koramangala"},
  {c:[12.99,77.69],r:0.030,n:"Mahadevapura / Whitefield IT"},
  {c:[12.915,77.645],r:0.024,n:"HSR Layout"},
];
/* Construction-heavy zones (illustrative) */
const CONSTRUCTION=[
  {c:[12.926,77.676],r:0.018,n:"Bellandur–Devarabisanahalli"},
  {c:[12.946,77.668],r:0.016,n:"Yemalur–ORR corridor"},
  {c:[13.044,77.620],r:0.015,n:"Manyata–Nagavara"},
  {c:[12.902,77.696],r:0.014,n:"Sarjapur Rd"},
];
