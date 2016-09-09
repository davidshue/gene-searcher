## gene-searcher

This is a playground project that uses spring-boot to simulate a gene search web site


## Build and Run the Project

###check out the project first

git clone https://github.com/davidshue/gene-searcher.git

###build it

mvn clean package

###run it

java -jar target/*.jar

## web services endpoint
http://localhost:8080/api/v1/variants?q={gene_name}

http://localhost:8080/api/v1/suggest?genes={first two (at least) letters of the gene)


## Web Site endpoint

http://localhost:8080